import { getDb } from "../api/queries/connection";
import { users } from "./schema";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";

type Cust = { id: number; name?: string; email?: string; password?: string; mobile1?: string; status?: number };

async function run() {
  const db = getDb();
  const cust: Cust[] = JSON.parse(readFileSync(new URL("../public/customers.json", import.meta.url), "utf8"));
  console.log(`Importing ${cust.length} old-site customers into users table…`);

  let imported = 0, skipped = 0;
  const seen = new Set<string>();
  for (const c of cust) {
    const email = String(c.email || "").trim().toLowerCase();
    if (!email || !email.includes("@") || seen.has(email)) { skipped++; continue; }
    seen.add(email);
    const pass = await bcrypt.hash(String(c.password || "changeme123"), 8);
    await db.insert(users).values({
      email,
      password: pass,
      fullName: c.name || email,
      role: "customer",
      status: "active",
      phone: String(c.mobile1 || ""),
    }).onDuplicateKeyUpdate({ set: { fullName: c.name || email, phone: String(c.mobile1 || ""), password: pass } });
    imported++;
    if (imported % 100 === 0) console.log(`  …${imported} done`);
  }
  console.log(`Done. imported/updated: ${imported}, skipped (empty/dup email): ${skipped}`);
  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
