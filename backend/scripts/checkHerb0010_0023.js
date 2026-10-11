import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const client = await pool.connect();
  try {
    // Find HERB_REC_0010 and HERB_REC_0023
    const herbs = await client.query('SELECT code, english_name FROM herbs WHERE code IN ($1, $2)', ['HERB_REC_0010', 'HERB_REC_0023']);
    console.log('Herbs:');
    herbs.rows.forEach(h => console.log(`  ${h.code}: ${h.english_name}`));
    
    // Check their Rasa and Virya
    for (const herb of herbs.rows) {
      const rasa = await client.query(`
        SELECT rt.canonical_en FROM herb_rasa hr
        JOIN rasa_terms rt ON hr.rasa_id = rt.id
        WHERE hr.herb_id = (SELECT id FROM herbs WHERE code = $1)
      `, [herb.code]);
      
      const virya = await client.query(`
        SELECT vt.canonical_en FROM virya_terms vt
        WHERE vt.id = (SELECT virya_id FROM herbs WHERE code = $1)
      `, [herb.code]);
      
      console.log(`\n${herb.code}:`);
      console.log(`  Rasa: ${rasa.rows.map(r => r.canonical_en).join(', ') || 'none'}`);
      console.log(`  Virya: ${virya.rows[0]?.canonical_en || 'none'}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

check().catch(console.error);
