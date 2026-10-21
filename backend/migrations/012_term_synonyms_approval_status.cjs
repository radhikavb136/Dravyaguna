/** @type {import('node-pg-migrate').MigrationBuilder} */
exports.up = (pgm) => {
  pgm.addColumn('term_synonyms', {
    approval_status: { type: 'text', notNull: true, default: 'draft' },
  });
  pgm.addConstraint('term_synonyms', 'term_synonyms_approval_status_check', {
    check: "approval_status IN ('draft', 'approved')",
  });
};
