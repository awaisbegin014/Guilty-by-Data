/**
 * scripts/seed-teams.ts
 *
 * Idempotent team seeding script.
 * Reads scripts/teams.csv and creates Supabase auth users +
 * public.teams rows. Safe to re-run: existing records are skipped or updated.
 *
 * Usage:
 *   npm run seed:teams
 *
 * Env vars are loaded automatically from .env.local in the repo root.
 * Required:
 *   SUPABASE_URL              — project URL
 *   SUPABASE_SERVICE_ROLE_KEY — service-role secret (never expose publicly)
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

// ── Paths ─────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const REPO_ROOT  = path.resolve(__dirname, '..');
const CSV_PATH   = path.join(__dirname, 'teams.csv');

// ── Load .env.local ───────────────────────────────────────────────────────
function loadEnvLocal(repoRoot: string): void {
  const envPath = path.join(repoRoot, '.env.local');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx < 1) continue;
    const key = line.slice(0, eqIdx).trim();
    const val = line.slice(eqIdx + 1).trim();
    if (key && !(key in process.env)) {
      process.env[key] = val;
    }
  }
}

loadEnvLocal(REPO_ROOT);

// ── Config ────────────────────────────────────────────────────────────────
const SUPABASE_URL      = process.env.SUPABASE_URL ?? '';
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const EMAIL_DOMAIN      = 'guiltybydata.local';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    '\n❌  Missing required env vars.\n' +
    '    Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local\n'
  );
  process.exit(1);
}

// ── Supabase client ───────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── CSV helpers ───────────────────────────────────────────────────────────
interface TeamRow {
  full_name: string;
  username:  string;
  password:  string;
}

function parseCsv(csvPath: string): TeamRow[] {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV not found: ${csvPath}`);
  }
  const raw   = fs.readFileSync(csvPath, 'utf-8');
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    throw new Error('CSV must have a header row and at least one data row.');
  }

  const headers      = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const requiredCols = ['full_name', 'username', 'password'] as const;
  for (const col of requiredCols) {
    if (!headers.includes(col)) {
      throw new Error(`CSV is missing required column: "${col}"`);
    }
  }

  const rows: TeamRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ''; });

    const full_name = row['full_name'] ?? '';
    const username  = row['username']  ?? '';
    const password  = row['password']  ?? '';

    if (!full_name) throw new Error(`Row ${i + 1}: full_name is blank`);
    if (!username)  throw new Error(`Row ${i + 1}: username is blank`);
    if (!password)  throw new Error(`Row ${i + 1}: password is blank`);
    if (password.length < 6) {
      throw new Error(`Row ${i + 1}: password for "${username}" must be at least 6 characters`);
    }
    if (!/^[a-z0-9_-]+$/i.test(username)) {
      throw new Error(`Row ${i + 1}: username "${username}" contains invalid characters (use a-z, 0-9, _ or -)`);
    }

    rows.push({ full_name, username: username.toLowerCase(), password });
  }
  return rows;
}

// ── Prompt helper ─────────────────────────────────────────────────────────
function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ── Main ──────────────────────────────────────────────────────────────────
async function seedTeams(): Promise<void> {
  console.log(`\n🌱  Guilty-by-Data — Team Seeder`);
  console.log(`    CSV  : ${CSV_PATH}`);
  console.log(`    URL  : ${SUPABASE_URL}\n`);

  const teams = parseCsv(CSV_PATH);
  console.log(`Found ${teams.length} team(s) to seed:\n`);
  for (const t of teams) {
    console.log(`  • ${t.username.padEnd(16)} ${t.full_name}`);
  }

  const confirm = await prompt(`\nProceed? [y/N] `);
  if (confirm.toLowerCase() !== 'y') {
    console.log('Aborted.');
    process.exit(0);
  }
  console.log('');

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed  = 0;

  for (const team of teams) {
    const email = `${team.username}@${EMAIL_DOMAIN}`;
    process.stdout.write(`  [${team.username.padEnd(14)}] `);

    try {
      // ── Step 1: Resolve or create auth user ───────────────────────────
      let userId: string;
      let authStatus: 'created' | 'exists';

      const { data: createData, error: createError } =
        await supabase.auth.admin.createUser({
          email,
          password: team.password,
          email_confirm: true,
          user_metadata: { username: team.username, full_name: team.full_name },
        });

      if (createError) {
        const msg = createError.message.toLowerCase();
        if (msg.includes('already been registered') || msg.includes('already exists') || msg.includes('email address')) {
          // Look up existing user
          const { data: listData, error: listErr } =
            await supabase.auth.admin.listUsers({ perPage: 1000 });
          if (listErr) throw listErr;
          const existing = listData.users.find((u) => u.email === email);
          if (!existing) {
            throw new Error(`User with email ${email} not found after conflict`);
          }
          userId     = existing.id;
          authStatus = 'exists';
        } else {
          throw createError;
        }
      } else {
        userId     = createData.user.id;
        authStatus = 'created';
      }

      // ── Step 2: Upsert public.teams ───────────────────────────────────
      const { error: upsertErr } = await supabase
        .from('teams')
        .upsert(
          { id: userId, name: team.full_name, username: team.username },
          { onConflict: 'id', ignoreDuplicates: false },
        );
      if (upsertErr) throw upsertErr;

      if (authStatus === 'created') {
        process.stdout.write('✅  created\n');
        created++;
      } else {
        process.stdout.write('🔄  updated (already existed)\n');
        updated++;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('already')) {
        process.stdout.write('⚠️  skipped (duplicate)\n');
        skipped++;
      } else {
        process.stdout.write(`❌  FAILED — ${msg}\n`);
        failed++;
      }
    }
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  ✅  Created : ${created}`);
  console.log(`  🔄  Updated : ${updated}`);
  console.log(`  ⚠️  Skipped : ${skipped}`);
  console.log(`  ❌  Failed  : ${failed}`);
  console.log(`${'─'.repeat(50)}\n`);

  if (failed > 0) process.exit(1);
}

void seedTeams();
