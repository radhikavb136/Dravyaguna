/**
 * support_requests was added after 011_enable_rls_public_tables; enable RLS with no policies
 * (same posture as other public tables — API uses the service role connection).
 */

/** @type {import('node-pg-migrate').MigrationBuilder} */
exports.up = (pgm) => {
  pgm.sql('ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;');
};

/** @type {import('node-pg-migrate').MigrationBuilder} */
exports.down = (pgm) => {
  pgm.sql('ALTER TABLE support_requests DISABLE ROW LEVEL SECURITY;');
};
