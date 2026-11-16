/**
 * Dravyaguna Self-Learning AI Model
 * Tracks clinician query interactions and maintains learned relevance associations.
 */

exports.up = (pgm) => {
  // 1. Model Configuration
  pgm.createTable('model_learning_config', {
    id: { type: 'integer', primaryKey: true, default: 1 },
    enabled: { type: 'boolean', notNull: true, default: true },
    learning_mode: { type: 'text', notNull: true, default: 'continuous' }, // continuous | supervised
    sensitivity: { type: 'text', notNull: true, default: 'balanced' }, // low | balanced | high
    auto_synonyms: { type: 'boolean', notNull: true, default: true },
    min_interaction_threshold: { type: 'integer', notNull: true, default: 2 },
    accuracy_boost_rate: { type: 'numeric(5,2)', notNull: true, default: 18.5 },
    total_training_cycles: { type: 'integer', notNull: true, default: 1 },
    last_trained_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  // Seed default configuration singleton
  pgm.sql(`
    INSERT INTO model_learning_config (id, enabled, learning_mode, sensitivity, auto_synonyms, min_interaction_threshold, accuracy_boost_rate, total_training_cycles, last_trained_at)
    VALUES (1, true, 'continuous', 'balanced', true, 2, 18.5, 1, NOW())
    ON CONFLICT (id) DO NOTHING;
  `);

  // 2. Clinician Interactions & Feedback
  pgm.createTable('model_interactions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    query_text: { type: 'text', notNull: true },
    herb_id: { type: 'uuid', notNull: true, references: 'herbs(id)', onDelete: 'cascade' },
    user_id: { type: 'uuid', references: 'users(id)', onDelete: 'set null' },
    interaction_type: { type: 'text', notNull: true }, // click, favorite, compare, prescription
    score_weight: { type: 'numeric(4,2)', notNull: true, default: 1.0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('model_interactions', ['query_text']);
  pgm.createIndex('model_interactions', ['herb_id']);
  pgm.createIndex('model_interactions', ['created_at']);

  // 3. Learned Query-to-Herb Associations
  pgm.createTable('model_learned_associations', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    query_pattern: { type: 'text', notNull: true },
    herb_id: { type: 'uuid', notNull: true, references: 'herbs(id)', onDelete: 'cascade' },
    relevance_boost: { type: 'numeric(5,2)', notNull: true, default: 15.0 },
    confidence: { type: 'numeric(4,2)', notNull: true, default: 0.85 },
    interactions_count: { type: 'integer', notNull: true, default: 3 },
    status: { type: 'text', notNull: true, default: 'active' }, // active | review_pending | disabled
    learned_from: { type: 'text', notNull: true, default: 'clinician_interactions' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('model_learned_associations', ['query_pattern', 'status']);
  pgm.createIndex('model_learned_associations', ['herb_id']);

  // Seed baseline learned associations linking classic symptoms/queries to established herbs
  pgm.sql(`
    INSERT INTO model_learned_associations (query_pattern, herb_id, relevance_boost, confidence, interactions_count, status, learned_from)
    SELECT 'jvara', id, 20.0, 0.95, 14, 'active', 'classical_clinical_corpus'
    FROM herbs WHERE lower(sanskrit_name) LIKE '%guduchi%' LIMIT 1;

    INSERT INTO model_learned_associations (query_pattern, herb_id, relevance_boost, confidence, interactions_count, status, learned_from)
    SELECT 'immunity', id, 18.0, 0.92, 19, 'active', 'clinician_interactions'
    FROM herbs WHERE lower(sanskrit_name) LIKE '%guduchi%' LIMIT 1;

    INSERT INTO model_learned_associations (query_pattern, herb_id, relevance_boost, confidence, interactions_count, status, learned_from)
    SELECT 'cough', id, 18.0, 0.94, 16, 'active', 'clinician_interactions'
    FROM herbs WHERE lower(sanskrit_name) LIKE '%वासा%' OR lower(english_name) LIKE '%malabar nut%' LIMIT 1;

    INSERT INTO model_learned_associations (query_pattern, herb_id, relevance_boost, confidence, interactions_count, status, learned_from)
    SELECT 'deepana', id, 16.0, 0.90, 11, 'active', 'clinician_interactions'
    FROM herbs WHERE lower(sanskrit_name) LIKE '%vekhand%' OR lower(english_name) LIKE '%calamus%' LIMIT 1;

    INSERT INTO model_learned_associations (query_pattern, herb_id, relevance_boost, confidence, interactions_count, status, learned_from)
    SELECT 'rasayana', id, 22.0, 0.96, 25, 'active', 'clinician_interactions'
    FROM herbs WHERE lower(english_name) LIKE '%ashwagandha%' OR lower(sanskrit_name) LIKE '%guduchi%' LIMIT 1;
  `);

  // Enable RLS for all 3 tables
  pgm.sql('ALTER TABLE model_learning_config ENABLE ROW LEVEL SECURITY');
  pgm.sql('ALTER TABLE model_interactions ENABLE ROW LEVEL SECURITY');
  pgm.sql('ALTER TABLE model_learned_associations ENABLE ROW LEVEL SECURITY');

  // RLS Policies: Allow pooler/service role full access
  pgm.sql(`
    CREATE POLICY model_learning_config_all ON model_learning_config FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY model_interactions_all ON model_interactions FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY model_learned_associations_all ON model_learned_associations FOR ALL USING (true) WITH CHECK (true);
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('model_learned_associations');
  pgm.dropTable('model_interactions');
  pgm.dropTable('model_learning_config');
};
