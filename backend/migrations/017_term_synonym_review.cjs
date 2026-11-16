/** @type {import('node-pg-migrate').MigrationBuilder} */
exports.up = (pgm) => {
  pgm.dropConstraint('term_synonyms', 'term_synonyms_approval_status_check');
  pgm.addConstraint('term_synonyms', 'term_synonyms_approval_status_check', {
    check: "approval_status IN ('draft', 'approved', 'rejected')",
  });
  pgm.addColumns('term_synonyms', {
    reviewed_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    reviewed_at: { type: 'timestamptz' },
    rejection_reason: { type: 'text' },
  });
};

/** @type {import('node-pg-migrate').MigrationBuilder} */
exports.down = (pgm) => {
  pgm.dropColumns('term_synonyms', ['reviewed_by', 'reviewed_at', 'rejection_reason']);
  pgm.dropConstraint('term_synonyms', 'term_synonyms_approval_status_check');
  pgm.addConstraint('term_synonyms', 'term_synonyms_approval_status_check', {
    check: "approval_status IN ('draft', 'approved')",
  });
};
