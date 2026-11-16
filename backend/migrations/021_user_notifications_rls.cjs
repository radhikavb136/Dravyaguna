exports.up = (pgm) => {
  pgm.sql('ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY');
};

exports.down = (pgm) => {
  pgm.sql('ALTER TABLE user_notifications DISABLE ROW LEVEL SECURITY');
};
