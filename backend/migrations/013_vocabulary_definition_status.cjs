/** @type {import('node-pg-migrate').MigrationBuilder} */
exports.up = (pgm) => {
  for (const table of [
    'rasa_terms', 'guna_terms', 'karma_terms', 'indication_terms', 'virya_terms',
    'vipaka_terms', 'dhatu_terms', 'mala_terms', 'srotas_terms', 'avayava_terms',
  ]) {
    pgm.addColumn(table, {
      definition_status: { type: 'text', notNull: true, default: 'draft' },
    });
    pgm.addConstraint(table, `${table}_definition_status_check`, {
      check: "definition_status IN ('draft', 'verified')",
    });
  }
};
