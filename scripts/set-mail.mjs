#!/usr/bin/env node
/*
 * Point outgoing mail at a mailbox — interactively, and safely.
 *
 *   node scripts/set-mail.mjs
 *
 * Why a script rather than "edit .env and restart": a wrong password there
 * silently breaks every welcome email, payment receipt and lead alert until
 * someone notices. This logs in FIRST and only writes .env once the provider
 * has accepted the credentials, so a bad password changes nothing.
 *
 * The password is read from the terminal with echo off, is never printed,
 * never logged, and never passed as an argument (which would land in shell
 * history and the process list).
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import nodemailer from "nodemailer";

const ENV = path.resolve(process.cwd(), ".env");

/* digitalcarda.in's MX is Zoho, and its SPF authorises zohomail.in — so mail
   sent as @digitalcarda.in has to leave through Zoho to pass SPF. */
const PRESETS = {
  zoho: { host: "smtp.zoho.in", port: 465 },
  gmail: { host: "smtp.gmail.com", port: 465 },
};

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q, fallback = "") =>
  new Promise((r) => rl.question(fallback ? `${q} [${fallback}]: ` : `${q}: `, (a) => r(a.trim() || fallback)));

/** Same prompt, with the terminal echo suppressed. */
function askSecret(q) {
  return new Promise((resolve) => {
    const onWrite = rl._writeToOutput;
    rl._writeToOutput = function (s) { if (s.includes(q)) onWrite.call(rl, s); };
    rl.question(`${q}: `, (a) => { rl._writeToOutput = onWrite; process.stdout.write("\n"); resolve(a.trim()); });
  });
}

/** Replace a key in .env, or append it if it isn't there. Comments survive.
 *  The replacement is passed as a FUNCTION on purpose: with a string, JS treats
 *  $&, $` and $' inside it as replacement patterns, so a password containing a
 *  dollar sign was silently corrupted — $` even spliced the preceding .env
 *  lines (including DATABASE_URL) into the value. A function replacer is taken
 *  literally. */
function setKey(text, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  return re.test(text) ? text.replace(re, () => line) : text.replace(/\n*$/, () => `\n${line}\n`);
}

const main = async () => {
  if (!fs.existsSync(ENV)) { console.error(`✗ No .env in ${process.cwd()} — run this from the app directory.`); process.exit(1); }

  console.log("\n  Set the mailbox DigitalCarda sends from.\n");
  const address = await ask("  Email address to send from", "hello@digitalcarda.in");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) { console.error("✗ That doesn't look like an email address."); process.exit(1); }

  const guess = address.endsWith("@gmail.com") ? "gmail" : "zoho";
  const which = (await ask("  Provider (zoho / gmail / other)", guess)).toLowerCase();
  const preset = PRESETS[which];
  const host = preset ? preset.host : await ask("  SMTP host");
  const port = Number(preset ? preset.port : await ask("  SMTP port", "465"));
  const user = await ask("  SMTP username", address);

  console.log(`\n  ${which === "zoho" ? "Zoho: use an app-specific password (Zoho Mail → Settings → Security → App Passwords)." : ""}`);
  console.log("  The password is not shown as you type, and is never written to logs or shell history.\n");
  const pass = (await askSecret("  Password")).replace(/\s+/g, "");
  rl.close();
  if (!pass) { console.error("✗ No password entered — nothing changed."); process.exit(1); }

  process.stdout.write(`\n  Checking the login at ${host}:${port}… `);
  try {
    await nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } }).verify();
    console.log("accepted.");
  } catch (e) {
    console.log("REJECTED.");
    console.error(`\n✗ ${e.message}`);
    console.error("  .env was NOT modified — your current mail settings are untouched.");
    if (/auth/i.test(e.message)) console.error("  For Zoho and Gmail this usually means an app-specific password is required.");
    process.exit(1);
  }

  const backup = `${ENV}.bak-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  let text = fs.readFileSync(ENV, "utf8");
  fs.writeFileSync(backup, text);

  text = setKey(text, "SMTP_HOST", host);
  text = setKey(text, "SMTP_PORT", String(port));
  text = setKey(text, "SMTP_USER", user);
  text = setKey(text, "SMTP_PASS", pass);
  text = setKey(text, "MAIL_FROM", `DigitalCarda <${address}>`);
  text = setKey(text, "LEAD_NOTIFY_TO", address);
  fs.writeFileSync(ENV, text);

  console.log(`\n✓ .env updated (previous copy kept at ${path.basename(backup)}).`);
  console.log(`  From now on every email goes out as: DigitalCarda <${address}>`);
  console.log("\n  Apply it:  pm2 reload ecosystem.config.cjs --update-env");
  console.log("  Then send a test from Admin → Settings → Email, and check Admin → Email Log.\n");
};

main().catch((e) => { console.error("✗", e.message); process.exit(1); });
