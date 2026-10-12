/**
 * Migration: Add favorites and saved_searches tables
 */

exports.up = (pgm) => {
  // Favorites table
  pgm.createTable('favorites', {
    id: { type: 'serial', primaryKey: true },
    user_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'cascade' },
    herb_id: { type: 'uuid', notNull: true, references: 'herbs(id)', onDelete: 'cascade' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('favorites', ['user_id', 'herb_id'], { unique: true });

  // Saved searches table
  pgm.createTable('saved_searches', {
    id: { type: 'serial', primaryKey: true },
    user_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'cascade' },
    name: { type: 'text', notNull: true },
    filters: { type: 'jsonb', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('saved_searches', ['user_id']);
};

exports.down = (pgm) => {
  pgm.dropTable('saved_searches');
  pgm.dropTable('favorites');
};
