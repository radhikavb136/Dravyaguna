exports.up = (pgm) => {
  pgm.addColumns('users', {
    display_name: { type: 'text' },
    preferred_language: { type: 'language_code', notNull: true, default: 'en-IN' },
    preferences: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('users', ['display_name', 'preferred_language', 'preferences']);
};
