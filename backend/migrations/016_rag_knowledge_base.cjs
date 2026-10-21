/** @type {import('node-pg-migrate').MigrationBuilder} */
exports.up = (pgm) => {
  pgm.alterColumn('rag_explanation_cache', 'herb_id', { notNull: false });
  pgm.createTable('rag_documents', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    source_key: { type: 'text', notNull: true, unique: true },
    source_identifier: { type: 'text', notNull: true },
    title: { type: 'text', notNull: true },
    source_type: { type: 'text', notNull: true },
    content_hash: { type: 'text', notNull: true },
    metadata: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('rag_documents', 'content_hash');
  pgm.createTable('rag_chunks', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    document_id: { type: 'uuid', notNull: true, references: 'rag_documents', onDelete: 'cascade' },
    chunk_index: { type: 'integer', notNull: true },
    content: { type: 'text', notNull: true },
    herb_id: { type: 'uuid', references: 'herbs', onDelete: 'cascade' },
    page_number: { type: 'integer' },
    section: { type: 'text' },
    metadata: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('rag_chunks', 'rag_chunks_document_chunk_unique', {
    unique: ['document_id', 'chunk_index'],
  });
  pgm.sql(`
    CREATE INDEX rag_chunks_content_fts_idx
      ON rag_chunks USING gin (to_tsvector('simple', content));
    CREATE INDEX rag_chunks_herb_id_idx ON rag_chunks (herb_id);
    ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;
    ALTER TABLE rag_chunks ENABLE ROW LEVEL SECURITY;
  `);
};
