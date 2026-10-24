import { createApp } from '../src/app.js';
import { listExpressRoutes } from '../src/utils/listExpressRoutes.js';
import { assert, assertEqual } from './lib/assert.js';

export async function run() {
  const app = createApp();
  const routes = listExpressRoutes(app);
  assert(routes.length > 0, 'expected at least one registered route');

  const seen = new Map();
  const duplicates = [];
  for (const route of routes) {
    const key = `${route.method} ${route.path}`;
    if (seen.has(key)) duplicates.push(key);
    else seen.set(key, true);
  }

  assertEqual(duplicates.length, 0, `duplicate method+path registrations: ${duplicates.join(', ')}`);
}
