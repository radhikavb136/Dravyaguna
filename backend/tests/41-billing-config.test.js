import { assertEqual } from './lib/assert.js';
import { isBillingConfigured } from '../src/config/billingConfig.js';

export async function run() {
  assertEqual(isBillingConfigured(), false, 'billing is not configured without provider keys in test env');
}
