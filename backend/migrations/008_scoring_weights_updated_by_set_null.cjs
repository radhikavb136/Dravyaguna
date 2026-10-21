/**
 * Allow deleting users who previously updated scoring weights.
 * ALTER only — does not drop tables.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.dropConstraint('scoring_weights', 'scoring_weights_updated_by_fkey', { ifExists: true });
  pgm.addConstraint('scoring_weights', 'scoring_weights_updated_by_fkey', {
    foreignKeys: {
      columns: 'updated_by',
      references: 'users(id)',
      onDelete: 'SET NULL',
    },
  });
};

exports.down = (pgm) => {
  pgm.dropConstraint('scoring_weights', 'scoring_weights_updated_by_fkey', { ifExists: true });
  pgm.addConstraint('scoring_weights', 'scoring_weights_updated_by_fkey', {
    foreignKeys: {
      columns: 'updated_by',
      references: 'users(id)',
    },
  });
};
