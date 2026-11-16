/**
 * Migration: authenticated user support / help requests
 */

exports.up = (pgm) => {
  pgm.createTable('support_requests', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'cascade' },
    topic: { type: 'text', notNull: true },
    message: { type: 'text', notNull: true },
    status: { type: 'text', notNull: true, default: 'open' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('support_requests', ['user_id']);
  pgm.createIndex('support_requests', ['status']);
  pgm.createIndex('support_requests', ['created_at']);
};

exports.down = (pgm) => {
  pgm.dropTable('support_requests');
};
