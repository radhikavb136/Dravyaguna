/** @type {import('node-pg-migrate').MigrationBuilder} */
exports.up = (pgm) => {
  pgm.addColumn('translation_cache', {
    provider: { type: 'text' },
    source_language: { type: 'language_code' },
    verified_at: { type: 'timestamptz' },
  });
};
