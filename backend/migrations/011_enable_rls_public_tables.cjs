/** @type {import('node-pg-migrate').MigrationBuilder} */
exports.up = (pgm) => {
  pgm.sql(`
    DO $migration$
    DECLARE target_table record;
    BEGIN
      FOR target_table IN
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname = 'public'
      LOOP
        EXECUTE format(
          'ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
          target_table.schemaname,
          target_table.tablename
        );
      END LOOP;
    END
    $migration$;
  `);
};
