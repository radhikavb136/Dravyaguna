const { Client } = require("pg");

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  await client.connect();

  try {
    const result = await client.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = $1 ORDER BY tablename",
      ["public"]
    );

    console.log("=== DATABASE TABLES ===");
    console.table(result.rows);

    const important = await client.query(`
      SELECT
        to_regclass('public.herbs') AS herbs,
        to_regclass('public.users') AS users,
        to_regclass('public.user_notifications') AS user_notifications
    `);

    console.log("=== IMPORTANT TABLES ===");
    console.table(important.rows);

    if (important.rows[0].herbs) {
      const count = await client.query(
        "SELECT COUNT(*)::int AS herb_count FROM public.herbs"
      );
      console.log("=== HERB COUNT ===");
      console.table(count.rows);
    }
  } finally {
    await client.end();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
