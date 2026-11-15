// Minimal migration runner.
//   npm run db:migrate   -> applies every src/db/migrations/*.sql not yet applied, in order
//   npm run db:seed      -> runs src/db/seeds/*.sql (idempotent seed data)
// Each file runs inside its own transaction and is recorded in schema_migrations.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const MIGRATIONS_DIR = path.join(__dirname, "migrations");
const SEEDS_DIR = path.join(__dirname, "seeds");

const sqlFiles = (dir) =>
  fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort() : [];

async function runFile(client, dir, file, afterSql) {
  const sql = fs.readFileSync(path.join(dir, file), "utf8");
  await client.query("BEGIN");
  try {
    await client.query(sql);
    if (afterSql) await client.query(afterSql, [file]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    err.message = `${file}: ${err.message}`;
    throw err;
  }
}

async function migrate(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  const { rows } = await client.query("SELECT filename FROM schema_migrations");
  const applied = new Set(rows.map((r) => r.filename));
  const pending = sqlFiles(MIGRATIONS_DIR).filter((f) => !applied.has(f));

  if (pending.length === 0) return console.log("Database is up to date.");
  for (const file of pending) {
    await runFile(client, MIGRATIONS_DIR, file, "INSERT INTO schema_migrations (filename) VALUES ($1)");
    console.log(`applied ${file}`);
  }
}

async function seed(client) {
  for (const file of sqlFiles(SEEDS_DIR)) {
    await runFile(client, SEEDS_DIR, file);
    console.log(`seeded ${file}`);
  }
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set (check .env)");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const cmd = process.argv[2] || "migrate";
    if (cmd === "migrate") await migrate(client);
    else if (cmd === "seed") await seed(client);
    else throw new Error(`Unknown command "${cmd}" (use migrate | seed)`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});