const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config({ path: path.join(__dirname, "..", ".env"), quiet: true });

// Same database as the Backend: borrow only its DATABASE_URL (not PORT or anything else)
if (!process.env.DATABASE_URL) {
  const backendEnv = path.join(__dirname, "..", "..", "Backend", ".env");
  if (fs.existsSync(backendEnv)) process.env.DATABASE_URL = dotenv.parse(fs.readFileSync(backendEnv)).DATABASE_URL;
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set (AI_bot/.env or Backend/.env)");

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

module.exports = { pool };
