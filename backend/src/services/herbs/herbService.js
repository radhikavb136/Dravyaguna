import { pool } from '../../db/pool.js';
import { logAudit } from '../audit/auditService.js';
import { slugify } from '../../utils/slugify.js';

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

export async function listHerbs({ page, limit, statuses }) {
  const offset = (page - 1) * limit;
  const { rows } = await pool.query(
    `SELECT id, code, english_name, sanskrit_name, botanical_name, status, created_at, updated_at
     FROM herbs
     WHERE status = ANY($1)
     ORDER BY english_name
     LIMIT $2 OFFSET $3`,
    [statuses, limit, offset]
  );

  const { rows: [{ count }] } = await pool.query(
    `SELECT COUNT(*)::int FROM herbs WHERE status = ANY($1)`,
    [statuses]
  );

  return {
    data: rows,
    pagination: {
      page,
      limit,
      pageSize: limit,
      total: parseInt(count),
      totalPages: Math.ceil(count / limit),
    },
  };
}

export async function getHerbById(id, userRole) {
  const { rows } = await pool.query(
    `SELECT * FROM herbs WHERE id = $1`,
    [id]
  );

  if (rows.length === 0) return null;

  const herb = rows[0];

  // Clinicians can only see reviewed/verified
  if (userRole === 'clinician' && !['reviewed', 'verified'].includes(herb.status)) {
    return null;
  }

  // Load related data
  const [rasa, guna, karma, indications, doshaActions, dhatu, mala, srotas, avayava, virya, vipaka, references] = await Promise.all([
    pool.query(
      `SELECT rt.canonical_en FROM herb_rasa hr JOIN rasa_terms rt ON hr.rasa_id = rt.id WHERE hr.herb_id = $1`,
      [id]
    ),
    pool.query(
      `SELECT gt.canonical_en FROM herb_guna hg JOIN guna_terms gt ON hg.guna_id = gt.id WHERE hg.herb_id = $1`,
      [id]
    ),
    pool.query(
      `SELECT kt.canonical_en FROM herb_karma hk JOIN karma_terms kt ON hk.karma_id = kt.id WHERE hk.herb_id = $1`,
      [id]
    ),
    pool.query(
      `SELECT it.canonical_en FROM herb_indications hi JOIN indication_terms it ON hi.indication_id = it.id WHERE hi.herb_id = $1`,
      [id]
    ),
    pool.query(
      `SELECT dosha, effect FROM herb_dosha_actions WHERE herb_id = $1`,
      [id]
    ),
    pool.query(
      `SELECT dt.canonical_en, score FROM herb_dhatu hd JOIN dhatu_terms dt ON hd.dhatu_id = dt.id WHERE hd.herb_id = $1`,
      [id]
    ),
    pool.query(
      `SELECT mt.canonical_en, effect FROM herb_mala hm JOIN mala_terms mt ON hm.mala_id = mt.id WHERE hm.herb_id = $1`,
      [id]
    ),
    pool.query(
      `SELECT st.canonical_en FROM herb_srotas hs JOIN srotas_terms st ON hs.srotas_id = st.id WHERE hs.herb_id = $1`,
      [id]
    ),
    pool.query(
      `SELECT at.canonical_en FROM herb_avayava ha JOIN avayava_terms at ON ha.avayava_id = at.id WHERE ha.herb_id = $1`,
      [id]
    ),
    pool.query(
      `SELECT vt.canonical_en FROM virya_terms vt WHERE vt.id = (SELECT virya_id FROM herbs WHERE id = $1)`,
      [id]
    ),
    pool.query(
      `SELECT vt.canonical_en FROM vipaka_terms vt WHERE vt.id = (SELECT vipaka_id FROM herbs WHERE id = $1)`,
      [id]
    ),
    pool.query(
      `SELECT source, citation_text, chapter_ref FROM herb_references WHERE herb_id = $1 ORDER BY id`,
      [id]
    ),
  ]);

  return {
    ...herb,
    rasa: rasa.rows.map(r => r.canonical_en),
    guna: guna.rows.map(g => g.canonical_en),
    karma: karma.rows.map(k => k.canonical_en),
    indications: indications.rows.map(i => i.canonical_en),
    dosha_actions: doshaActions.rows,
    dhatu: dhatu.rows.reduce((acc, row) => {
      acc[row.canonical_en] = row.score;
      return acc;
    }, {}),
    mala: mala.rows.map(m => ({ mala: m.canonical_en, effect: m.effect })),
    srotas: srotas.rows.map(s => s.canonical_en),
    avayava: avayava.rows.map(a => a.canonical_en),
    virya: virya.rows[0]?.canonical_en || null,
    vipaka: vipaka.rows[0]?.canonical_en || null,
    references: references.rows.map((row) => {
      try {
        const citation = JSON.parse(row.citation_text);
        return { source: row.source, chapter: row.chapter_ref || '', verse: citation.verse || '', notes: citation.notes || '' };
      } catch {
        return { source: row.source, chapter: row.chapter_ref || '', verse: '', notes: row.citation_text || '' };
      }
    }),
  };
}

export async function createHerb(data, user) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get term IDs for vocabulary fields
    const [viryaId, vipakaId] = await Promise.all([
      data.virya ? requireTermId(client, 'virya_terms', data.virya) : null,
      data.vipaka ? requireTermId(client, 'vipaka_terms', data.vipaka) : null,
    ]);

    // Insert herb
    const { rows: [herb] } = await client.query(
      `INSERT INTO herbs (code, english_name, sanskrit_name, botanical_name, local_name, family, part_used, description, identification_notes, prabhava, virya_id, vipaka_id, status, raw_karma, raw_indication)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'draft', $13, $14)
       RETURNING *`,
      [
        data.code,
        data.english_name,
        data.sanskrit_name || null,
        data.botanical_name || null,
        data.local_name || null,
        data.family || null,
        data.part_used || null,
        data.description || null,
        data.identification_notes || null,
        data.prabhava || null,
        viryaId,
        vipakaId,
        data.raw_karma || null,
        data.raw_indication || null,
      ]
    );

    // Insert junction table data
    await insertJunctionData(client, herb.id, data, user);

    await client.query('COMMIT');

    await logAudit({
      userId: user.id,
      action: 'create',
      entityType: 'herb',
      entityId: herb.id,
      before: null,
      after: data,
    });

    return await getHerbById(herb.id, user.role);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateHerb(id, data, user) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get existing herb for audit
    const { rows: [existing] } = await client.query('SELECT * FROM herbs WHERE id = $1', [id]);
    if (!existing) return null;

    if (user.role === 'editor' && data.status === 'verified') {
      const error = new Error('Editors cannot set status to verified');
      error.code = 'FORBIDDEN';
      throw error;
    }

    if (data.status === 'archived' && user.role !== 'admin') {
      const error = new Error('Only admins can archive herbs');
      error.code = 'FORBIDDEN';
      throw error;
    }

    let nextStatus = data.status !== undefined ? data.status : existing.status;
    if (existing.status === 'verified' && nextStatus !== 'archived') {
      nextStatus = 'reviewed';
    }

    const [viryaId, vipakaId] = await Promise.all([
      data.virya !== undefined ? requireTermId(client, 'virya_terms', data.virya) : existing.virya_id,
      data.vipaka !== undefined ? requireTermId(client, 'vipaka_terms', data.vipaka) : existing.vipaka_id,
    ]);

    // Update herb
    const { rows: [herb] } = await client.query(
      `UPDATE herbs
       SET code = COALESCE($2, code),
           english_name = COALESCE($3, english_name),
           sanskrit_name = COALESCE($4, sanskrit_name),
           botanical_name = COALESCE($5, botanical_name),
           local_name = COALESCE($6, local_name),
           family = COALESCE($7, family),
           part_used = COALESCE($8, part_used),
           description = COALESCE($9, description),
           identification_notes = COALESCE($10, identification_notes),
           prabhava = COALESCE($11, prabhava),
           virya_id = COALESCE($12, virya_id),
           vipaka_id = COALESCE($13, vipaka_id),
           status = COALESCE($14, status),
           raw_karma = COALESCE($15, raw_karma),
           raw_indication = COALESCE($16, raw_indication),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        data.code,
        data.english_name,
        data.sanskrit_name,
        data.botanical_name,
        data.local_name,
        data.family,
        data.part_used,
        data.description,
        data.identification_notes,
        data.prabhava,
        viryaId,
        vipakaId,
        nextStatus,
        data.raw_karma,
        data.raw_indication,
      ]
    );

    // Clear and reinsert junction data if provided
    if (data.rasa !== undefined || data.guna !== undefined || data.karma !== undefined ||
        data.indications !== undefined || data.dosha_actions !== undefined || data.dhatu !== undefined ||
        data.mala !== undefined || data.srotas !== undefined || data.avayava !== undefined || data.references !== undefined) {
      await clearJunctionData(client, id, data);
      await insertJunctionData(client, id, data, user);
    }

    await client.query('DELETE FROM rag_explanation_cache WHERE herb_id = $1', [id]);

    await client.query('COMMIT');

    await logAudit({
      userId: user.id,
      action: 'update',
      entityType: 'herb',
      entityId: id,
      before: existing,
      after: data,
    });

    return await getHerbById(id, user.role);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function verifyHerb(id, user) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows: [existing] } = await client.query('SELECT * FROM herbs WHERE id = $1', [id]);
    if (!existing) return null;

    const { rows: [herb] } = await client.query(
      `UPDATE herbs SET status = 'verified', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    await client.query('DELETE FROM rag_explanation_cache WHERE herb_id = $1', [id]);

    await client.query('COMMIT');

    await logAudit({
      userId: user.id,
      action: 'verify',
      entityType: 'herb',
      entityId: id,
      before: existing,
      after: herb,
    });

    return await getHerbById(id, user.role);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteHerb(id, user) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows: [existing] } = await client.query('SELECT * FROM herbs WHERE id = $1', [id]);
    if (!existing) return null;

    const { rows: [herb] } = await client.query(
      `UPDATE herbs SET status = 'archived', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    await client.query('DELETE FROM rag_explanation_cache WHERE herb_id = $1', [id]);

    await client.query('COMMIT');

    await logAudit({
      userId: user.id,
      action: 'delete',
      entityType: 'herb',
      entityId: id,
      before: existing,
      after: herb,
    });

    return herb;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function requireTermId(client, table, value) {
  if (value == null || value === '') {
    return null;
  }
  const slug = slugify(value);
  const { rows } = await client.query(
    `SELECT id FROM ${table}
     WHERE slug = $1 OR lower(canonical_en) = lower($2)
     LIMIT 1`,
    [slug, String(value).trim()]
  );
  if (!rows[0]) {
    throw badRequest(`Unknown term for ${table}: ${value}`);
  }
  return rows[0].id;
}

async function resolveOpenVocabTerm(client, table, item) {
  if (item && typeof item === 'object' && item.custom) {
    const slug = slugify(item.custom);
    const existing = await client.query(
      `SELECT id FROM ${table}
       WHERE slug = $1 OR lower(canonical_en) = lower($2)
       LIMIT 1`,
      [slug, item.custom.trim()]
    );
    if (existing.rows[0]) {
      return existing.rows[0].id;
    }
    const { rows } = await client.query(
      `INSERT INTO ${table} (canonical_en, slug, is_custom)
       VALUES ($1, $2, true)
       RETURNING id`,
      [item.custom, slug]
    );
    return rows[0].id;
  }
  return requireTermId(client, table, item);
}

async function insertJunctionData(client, herbId, data) {
  if (data.rasa?.length > 0) {
    for (const name of data.rasa) {
      const termId = await requireTermId(client, 'rasa_terms', name);
      await client.query('INSERT INTO herb_rasa (herb_id, rasa_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [herbId, termId]);
    }
  }

  if (data.guna?.length > 0) {
    for (const name of data.guna) {
      const termId = await requireTermId(client, 'guna_terms', name);
      await client.query('INSERT INTO herb_guna (herb_id, guna_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [herbId, termId]);
    }
  }

  if (data.karma?.length > 0) {
    for (const item of data.karma) {
      const termId = await resolveOpenVocabTerm(client, 'karma_terms', item);
      await client.query('INSERT INTO herb_karma (herb_id, karma_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [herbId, termId]);
    }
  }

  if (data.indications?.length > 0) {
    for (const item of data.indications) {
      const termId = await resolveOpenVocabTerm(client, 'indication_terms', item);
      await client.query('INSERT INTO herb_indications (herb_id, indication_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [herbId, termId]);
    }
  }

  if (Array.isArray(data.dosha_actions)) {
    for (const row of data.dosha_actions) {
      await client.query(
        'INSERT INTO herb_dosha_actions (herb_id, dosha, effect) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [herbId, row.dosha, row.effect]
      );
    }
  }

  if (Array.isArray(data.dhatu)) {
    for (const row of data.dhatu) {
      const termId = await requireTermId(client, 'dhatu_terms', row.term);
      await client.query(
        'INSERT INTO herb_dhatu (herb_id, dhatu_id, score) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [herbId, termId, row.score]
      );
    }
  }

  if (Array.isArray(data.mala)) {
    for (const row of data.mala) {
      const termId = await requireTermId(client, 'mala_terms', row.term);
      await client.query(
        'INSERT INTO herb_mala (herb_id, mala_id, effect) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [herbId, termId, row.effect]
      );
    }
  }

  if (data.srotas?.length > 0) {
    for (const name of data.srotas) {
      const termId = await requireTermId(client, 'srotas_terms', name);
      await client.query('INSERT INTO herb_srotas (herb_id, srotas_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [herbId, termId]);
    }
  }

  if (data.avayava?.length > 0) {
    for (const name of data.avayava) {
      const termId = await requireTermId(client, 'avayava_terms', name);
      await client.query('INSERT INTO herb_avayava (herb_id, avayava_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [herbId, termId]);
    }
  }

  if (Array.isArray(data.references)) {
    for (const reference of data.references) {
      const source = reference.source?.trim();
      if (!source) continue;
      await client.query(
        `INSERT INTO herb_references (herb_id, source, citation_text, chapter_ref)
         VALUES ($1, $2, $3, $4)`,
        [herbId, source, JSON.stringify({ verse: reference.verse || '', notes: reference.notes || '' }), reference.chapter || null]
      );
    }
  }
}

async function clearJunctionData(client, herbId, data) {
  const groups = [
    ['rasa', 'herb_rasa'],
    ['guna', 'herb_guna'],
    ['karma', 'herb_karma'],
    ['indications', 'herb_indications'],
    ['dosha_actions', 'herb_dosha_actions'],
    ['dhatu', 'herb_dhatu'],
    ['mala', 'herb_mala'],
    ['srotas', 'herb_srotas'],
    ['avayava', 'herb_avayava'],
    ['references', 'herb_references'],
  ];
  await Promise.all(groups
    .filter(([field]) => data[field] !== undefined)
    .map(([, table]) => client.query(`DELETE FROM ${table} WHERE herb_id = $1`, [herbId])));
}
