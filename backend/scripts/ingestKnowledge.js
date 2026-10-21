import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pool } from '../src/db/pool.js';
import { getHerbById } from '../src/services/herbs/herbService.js';
import { chunkText, ingestKnowledgeDocument, parseKnowledgeFile } from '../src/services/explain/ragKnowledgeService.js';
import { assertTestDatabaseAllowed } from '../tests/lib/safety.js';

assertTestDatabaseAllowed();

const files = process.argv.slice(2).filter((argument) => argument !== '--herbs');
const includeHerbs = process.argv.includes('--herbs');
if (!files.length && !includeHerbs) {
  console.error('Usage: npm run rag:ingest -- [--herbs] <authorized-source.md|.txt|.json|.jsonl> [...]');
  process.exitCode = 2;
} else {
  let changed = 0;
  let unchanged = 0;
  let chunkCount = 0;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const file of files) {
      const absolutePath = path.resolve(file);
      const relativePath = path.relative(process.cwd(), absolutePath).replaceAll('\\', '/');
      const documents = parseKnowledgeFile(relativePath, await readFile(absolutePath, 'utf8'));
      for (const document of documents) {
        const result = await ingestKnowledgeDocument(client, document);
        if (result.changed) changed += 1;
        else unchanged += 1;
        chunkCount += result.chunks;
      }
    }

    if (includeHerbs) {
      const { rows: herbs } = await client.query('SELECT id, code, status FROM herbs WHERE status <> $1 ORDER BY code', ['archived']);
      for (const row of herbs) {
        const herb = await getHerbById(row.id, 'admin');
        const content = JSON.stringify({
          record_type: 'stored herb record',
          code: herb.code,
          status: herb.status,
          english_name: herb.english_name,
          sanskrit_name: herb.sanskrit_name,
          botanical_name: herb.botanical_name,
          local_names: herb.local_names,
          family: herb.family,
          part_used: herb.part_used,
          description: herb.description,
          prabhava: herb.prabhava,
          rasa: herb.rasa,
          guna: herb.guna,
          virya: herb.virya,
          vipaka: herb.vipaka,
          dosha_actions: herb.dosha_actions,
          dhatu: herb.dhatu,
          mala: herb.mala,
          srotas: herb.srotas,
          karma: herb.karma,
          indications: herb.indications,
          references: herb.references,
        });
        const result = await ingestKnowledgeDocument(client, {
          sourceKey: `db-herb:${herb.id}`,
          sourceIdentifier: `database:herb:${herb.code}`,
          title: `Stored herb record: ${herb.english_name}`,
          sourceType: 'herb_record',
          herbCode: herb.code,
          metadata: { status: herb.status, record_code: herb.code },
          chunks: chunkText(content).map((chunk, index) => ({
            content: chunk,
            pageNumber: null,
            section: 'Stored herb record',
            metadata: { record_code: herb.code, index },
          })),
        });
        if (result.changed) changed += 1;
        else unchanged += 1;
        chunkCount += result.chunks;
      }
    }
    await client.query('COMMIT');
    console.log(JSON.stringify({ changed_documents: changed, unchanged_documents: unchanged, indexed_chunks: chunkCount }));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Knowledge ingestion failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}
