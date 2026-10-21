import { assertEqual } from './lib/assert.js';
import { api } from './lib/http.js';
import { getTokens } from './lib/session.js';

export async function run() {
  const { tokens } = await getTokens();
  const code = `zz_test_val_${Date.now()}`;

  const dhatu = await api('POST', '/api/herbs', {
    token: tokens.editor,
    body: {
      code,
      english_name: 'ZZ Test Validation',
      dhatu: [{ term: 'rasa', score: 7 }],
    },
  });
  assertEqual(dhatu.status, 400, 'dhatu score 7');

  const mala = await api('POST', '/api/herbs', {
    token: tokens.editor,
    body: {
      code: `${code}_mala`,
      english_name: 'ZZ Test Validation Mala',
      mala: [{ term: 'purisha', effect: 'pacifies' }],
    },
  });
  assertEqual(mala.status, 400, 'mala pacifies');
}
