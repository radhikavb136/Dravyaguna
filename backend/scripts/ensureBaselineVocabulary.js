/**
 * Idempotent baseline Ayurvedic vocabulary for local dev/tests (no herb truncation).
 */
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function insertTerms(table, terms) {
  for (const term of terms) {
    const slug = term.toLowerCase().replace(/\s+/g, '-');
    await pool.query(
      `INSERT INTO ${table} (canonical_en, slug)
       VALUES ($1, $2)
       ON CONFLICT (slug) DO NOTHING`,
      [term, slug]
    );
  }
}

const rasa = ['Madhura', 'Amla', 'Lavana', 'Katu', 'Tikta', 'Kashaya'];
const guna = ['Guru', 'Laghu', 'Snigdha', 'Ruksha', 'Ushna', 'Sheeta', 'Sukshma', 'Sthula', 'Sandra', 'Drava', 'Mridu', 'Kathina', 'Sara', 'Picchila', 'Manda', 'Vyavayi', 'Vishada', 'Tikshna'];
const karma = ['Deepana', 'Pachana', 'Rasayana', 'Balya', 'Ropana', 'Varnya', 'Jvaraghna', 'Krimighna', 'Kandughna', 'Kusthaghna', 'Pittashamak', 'Kaphashamak', 'Vatashamak', 'Vatakaphashamak', 'Pittakaphashamak', 'Vadapittashamak', 'Medhya', 'Vrishya', 'Anulomana', 'Grahi', 'Mutrala', 'Rechana', 'Vatanuloman', 'Dahashamak', 'Vishaghna', 'Tridoshhar'];
const srotas = ['Pranavaha', 'Annavaha', 'Udakavaha', 'Rasavaha', 'Raktavaha', 'Mamsavaha', 'Medovaha', 'Asthivaha', 'Majjavaha', 'Shukravaha', 'Mutravaha', 'Swedavaha', 'Purishavaha', 'Artavavaha'];
const virya = ['Ushna', 'Sheeta'];
const vipaka = ['Madhura', 'Amla', 'Katu'];
const mala = ['Purisha', 'Mutra', 'Sveda'];
const dhatu = ['Rasa', 'Rakta', 'Mamsa', 'Meda', 'Asthi', 'Majja', 'Shukra'];

await insertTerms('rasa_terms', rasa);
await insertTerms('guna_terms', guna);
await insertTerms('karma_terms', karma);
await insertTerms('srotas_terms', srotas);
await insertTerms('virya_terms', virya);
await insertTerms('vipaka_terms', vipaka);
await insertTerms('mala_terms', mala);
await insertTerms('dhatu_terms', dhatu);

console.log('Baseline vocabulary ensured (idempotent).');
await pool.end();
