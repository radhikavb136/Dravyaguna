/** @type {import('node-pg-migrate').MigrationBuilder} */
exports.up = (pgm) => {
  pgm.addColumns('herbs', {
    identification_notes: { type: 'text' },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('herbs', ['identification_notes']);
};
