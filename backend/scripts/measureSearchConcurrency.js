import dotenv from 'dotenv';
import autocannon from 'autocannon';
import { assertTestDatabaseAllowed } from '../tests/lib/safety.js';
import { getTokens } from '../tests/lib/session.js';

dotenv.config();
assertTestDatabaseAllowed();

const baseUrl = process.env.API_BASE_URL || 'http://127.0.0.1:4000';
const { tokens } = await getTokens();
const body = JSON.stringify({
  filters: {
    rasa: ['Tikta'], guna: ['Laghu'], karma: ['Rasayana', 'Balya'],
    indication: ['jwar'], virya: ['Ushna'], dosha: ['Vata · Decreases', 'Pitta · Decreases'],
  },
  lang: 'en-IN', limit: 50,
});

for (const connections of [5, 10]) {
  const result = await autocannon({
    url: `${baseUrl}/api/search/detailed`, method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.clinician}` },
    body, connections, duration: 10,
  });
  const format = (value) => Number.isFinite(value) ? value.toFixed(2) : 'N/A';
  const requestsPerSecond = result.requests.total / 10;
  process.stdout.write(`${connections} connections: ${result.requests.total} requests, ${format(requestsPerSecond)} req/s, avg ${format(result.latency.mean)} ms, p97.5 ${format(result.latency.p97_5)} ms, errors ${result.errors}, non-2xx ${result.non2xx}\n`);
}
