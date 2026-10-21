import readline from 'node:readline';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

function askLine(prompt) {
  const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => terminal.question(prompt, (answer) => {
    terminal.close();
    resolve(answer);
  }));
}

function askSecret(prompt) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    return Promise.reject(new Error('A terminal is required to enter the password securely.'));
  }

  process.stdout.write(prompt);
  process.stdin.setRawMode(true);
  process.stdin.resume();

  return new Promise((resolve, reject) => {
    let value = '';
    const cleanup = () => {
      process.stdin.removeListener('data', onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    };
    const onData = (chunk) => {
      for (const character of chunk.toString('utf8')) {
        if (character === '\u0003') {
          cleanup();
          process.stdout.write('\n');
          reject(new Error('Password entry cancelled.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          cleanup();
          process.stdout.write('\n');
          resolve(value);
          return;
        }
        if (character === '\u007f' || character === '\b') {
          value = value.slice(0, -1);
        } else {
          value += character;
        }
      }
    };
    process.stdin.on('data', onData);
  });
}

async function main() {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    throw new Error('A terminal is required to securely create the first admin.');
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');

  const email = (await askLine('First admin email: ')).trim().toLowerCase();
  const fullName = (await askLine('Admin full name: ')).trim();
  const password = await askSecret('Admin password (input hidden): ');
  const confirmation = await askSecret('Confirm password (input hidden): ');

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  if (!fullName || fullName.length > 120) throw new Error('Full name must be 1 to 120 characters.');
  if (password.length < 10 || password.length > 128) throw new Error('Password must be 10 to 128 characters.');
  if (password !== confirmation) throw new Error('Password confirmation did not match.');

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('dravyaguna:first-admin'))");
    const { rows: existing } = await client.query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'admin'");
    if (existing[0].count !== 0) {
      await client.query('ROLLBACK');
      throw new Error('An admin account already exists; this one-time bootstrap is disabled.');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await client.query(
      `INSERT INTO users (email, password_hash, full_name, role, status)
       VALUES ($1, $2, $3, 'admin', 'active')`,
      [email, passwordHash, fullName]
    );
    await client.query('COMMIT');
    console.log('Initial admin account created. Plaintext password was not written to disk or logs.');
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* transaction already closed */ }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message || 'Unable to create the initial admin account.');
  process.exitCode = 1;
});
