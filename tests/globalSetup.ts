import { execSync } from "child_process";
import { existsSync, unlinkSync } from "fs";
import path from "path";

export default async function globalSetup() {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "file:./test.db";
  process.env.JWT_SECRET = "test-jwt-secret-must-be-at-least-32-characters-long";

  // remove any leftover test db so each run starts from a clean slate
  const dbPath = path.join(__dirname, "..", "prisma", "test.db");
  if (existsSync(dbPath)) unlinkSync(dbPath);

  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "inherit",
  });
}
