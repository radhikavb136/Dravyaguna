import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { pool } from '../src/db/pool.js';

test('Self-Learning Model HTTP endpoints', async (t) => {
  const app = createApp();
  let server;
  let port;
  let baseUrl;
  let adminToken;
  let clinicianToken;

  t.before(async () => {
    const { rows: admins } = await pool.query(
      "SELECT id, email, role FROM users WHERE role = 'admin' AND status = 'active' LIMIT 1"
    );
    const { rows: clinicians } = await pool.query(
      "SELECT id, email, role FROM users WHERE role = 'clinician' AND status = 'active' LIMIT 1"
    );

    assert.ok(admins[0], 'Admin user found in DB');
    assert.ok(clinicians[0], 'Clinician user found in DB');

    adminToken = jwt.sign({ sub: admins[0].id }, env.jwtSecret, { expiresIn: '1h' });
    clinicianToken = jwt.sign({ sub: clinicians[0].id }, env.jwtSecret, { expiresIn: '1h' });

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  t.after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await pool.end();
  });

  await t.test('GET /api/model/status requires authentication', async () => {
    const res = await fetch(`${baseUrl}/api/model/status`);
    assert.equal(res.status, 401);
  });

  await t.test('GET /api/model/status returns model status for authenticated user', async () => {
    const res = await fetch(`${baseUrl}/api/model/status`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.ok(json.config);
    assert.ok(json.metrics);
  });

  await t.test('PUT /api/model/config rejects non-admin users', async () => {
    const res = await fetch(`${baseUrl}/api/model/config`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${clinicianToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sensitivity: 'low' }),
    });
    assert.equal(res.status, 403);
  });

  await t.test('POST /api/model/train allows admin to run learning cycle', async () => {
    const res = await fetch(`${baseUrl}/api/model/train`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
  });

  await t.test('POST /api/model/feedback allows clinicians to log feedback', async () => {
    const { rows: herbs } = await pool.query('SELECT id FROM herbs LIMIT 1');
    const herbId = herbs[0]?.id;
    if (herbId) {
      const res = await fetch(`${baseUrl}/api/model/feedback`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${clinicianToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          queryText: 'pitta balance',
          herbId,
          interactionType: 'click',
        }),
      });
      assert.equal(res.status, 201);
      const json = await res.json();
      assert.equal(json.success, true);
    }
  });
});
