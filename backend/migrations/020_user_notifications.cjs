/**
 * In-app notifications for clinicians and admin staff.
 */

exports.up = (pgm) => {
  pgm.createTable('user_notifications', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'cascade' },
    kind: { type: 'text', notNull: true },
    title: { type: 'text', notNull: true },
    body: { type: 'text', notNull: true },
    link_path: { type: 'text' },
    read_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('user_notifications', ['user_id', 'created_at']);
  pgm.createIndex('user_notifications', ['user_id', 'read_at']);
};

exports.down = (pgm) => {
  pgm.dropTable('user_notifications');
};
