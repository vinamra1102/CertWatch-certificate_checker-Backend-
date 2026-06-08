import { existsSync, unlinkSync } from "fs";
import path from "path";

export default async function globalTeardown() {
  const dbPath = path.join(__dirname, "..", "prisma", "test.db");
  if (existsSync(dbPath)) {
    try {
      unlinkSync(dbPath);
    } catch {
      // file may be locked on Windows; safe to ignore
    }
  }
}
