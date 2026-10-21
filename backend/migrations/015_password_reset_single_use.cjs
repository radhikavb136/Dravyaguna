/** @type {import('node-pg-migrate').MigrationBuilder} */
exports.up = (pgm) => {
  pgm.addColumn('password_reset_tokens', { used_at: { type: 'timestamptz' } });
  pgm.createIndex('password_reset_tokens', ['user_id', 'expires_at'], { name: 'password_reset_tokens_user_expiry_idx' });
};
