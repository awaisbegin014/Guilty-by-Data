/**
 * scripts/cleanup-teams.ts
 *
 * Interactive cleanup script for seeded teams.
 * Removes team data from ALL related tables + the auth.users record.
 *
 * Modes:
 *   1. Remove one team at a time (interactive loop)
 *   2. Remove ALL seeded teams and ALL their data
 *
 * Tables cleaned up (in dependency order):
 *   submission_answers → submissions → leaderboard → audit_log → teams → auth.users
 *
 * Seeded teams are identified by BOTH:
 *   - email ending in @guiltybydata.local
 *   - presence of a matching public.teams row
 *
 * Admin users are explicitly excluded even if they share the same email domain.
 *
 * Usage:
 *   npm run cleanup:teams
 *
 * Env vars are loaded automatically from .env.local in the repo root.
 * Required:
 *   SUPABASE_URL              — project URL
 *   SUPABASE_SERVICE_ROLE_KEY — service-role secret
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { createClient, type User } from '@supabase/supabase-js';

// ── Paths ─────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const REPO_ROOT  = path.resolve(__dirname, '..');

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
const SUPABASE_URL     = process.env.SUPABASE_URL ?? '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const EMAIL_DOMAIN     = 'guiltybydata.local';

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

// ── readline helpers ──────────────────────────────────────────────────────
let rl: readline.Interface | null = null;

function getRL(): readline.Interface {
  if (!rl || rl.terminal === undefined) {
    rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.on('close', () => { rl = null; });
  }
  return rl;
}

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    const iface = getRL();
    iface.question(question, (answer) => resolve(answer.trim()));
  });
}

function closeRL(): void {
  const current = rl;
  rl = null;
  current?.close();
}

// ── Data helpers ──────────────────────────────────────────────────────────
interface TeamInfo {
  id:       string;
  username: string;
  name:     string;
  email:    string;
}

async function fetchSeededTeams(): Promise<TeamInfo[]> {
  // List auth users, filter by the seeded email domain
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;

  const domainUsers = (data.users as User[]).filter(
    (u) => u.email?.endsWith(`@${EMAIL_DOMAIN}`)
  );

  if (domainUsers.length === 0) return [];

  const ids = domainUsers.map((u) => u.id);

  // Explicitly protect admin accounts even if they use the same email domain.
  const { data: adminRows, error: adminsErr } = await supabase
    .from('admins')
    .select('id')
    .in('id', ids);
  if (adminsErr) throw adminsErr;

  const adminIds = new Set((adminRows ?? []).map((row: { id: string }) => row.id));

  // Fetch matching teams rows for display info. Only users with a real
  // public.teams row are considered seeded teams eligible for cleanup.
  const { data: teamsData, error: teamsErr } = await supabase
    .from('teams')
    .select('id, username, name')
    .in('id', ids);
  if (teamsErr) throw teamsErr;

  const teamsMap = new Map(
    (teamsData ?? []).map((t: { id: string; username: string; name: string }) => [t.id, t])
  );

  return domainUsers.flatMap((u) => {
    if (adminIds.has(u.id)) {
      return [];
    }

    const team = teamsMap.get(u.id);
    if (!team) {
      return [];
    }

    return [{
      id:       u.id,
      username: team.username,
      name:     team.name,
      email:    u.email ?? '',
    }];
  });
}

async function deleteTeam(team: TeamInfo): Promise<{ tables: string[]; errors: string[] }> {
  const tables: string[] = [];
  const errors: string[] = [];

  // Refuse to delete admin accounts even if they somehow slip through filtering.
  const { data: adminRow, error: adminCheckErr } = await supabase
    .from('admins')
    .select('id')
    .eq('id', team.id)
    .maybeSingle();
  if (adminCheckErr) {
    errors.push(`admin check: ${adminCheckErr.message}`);
    return { tables, errors };
  }
  if (adminRow) {
    errors.push(`refusing to delete protected admin account: ${team.id}`);
    return { tables, errors };
  }

  // Delete in dependency order:
  // 1. submission_answers (FK → submissions)
  const { data: subRows, error: subFetchErr } = await supabase
    .from('submissions')
    .select('id')
    .eq('team_id', team.id);
  if (subFetchErr) { errors.push(`submissions fetch: ${subFetchErr.message}`); }

  if (subRows && subRows.length > 0) {
    const subIds = subRows.map((s: { id: string }) => s.id);
    const { error: saErr } = await supabase
      .from('submission_answers')
      .delete()
      .in('submission_id', subIds);
    if (saErr) errors.push(`submission_answers: ${saErr.message}`);
    else tables.push(`submission_answers (${subIds.length} submission(s))`);
  }

  // 2. submissions
  const { error: submErr } = await supabase
    .from('submissions')
    .delete()
    .eq('team_id', team.id);
  if (submErr) errors.push(`submissions: ${submErr.message}`);
  else tables.push('submissions');

  // 3. leaderboard
  const { error: lbErr } = await supabase
    .from('leaderboard')
    .delete()
    .eq('team_id', team.id);
  if (lbErr) errors.push(`leaderboard: ${lbErr.message}`);
  else tables.push('leaderboard');

  // 4. audit_log (actor_id = team auth user id)
  const { error: auditErr } = await supabase
    .from('audit_log')
    .delete()
    .eq('actor_id', team.id);
  if (auditErr) errors.push(`audit_log: ${auditErr.message}`);
  else tables.push('audit_log');

  // 5. teams row
  const { error: teamErr } = await supabase
    .from('teams')
    .delete()
    .eq('id', team.id);
  if (teamErr) errors.push(`teams: ${teamErr.message}`);
  else tables.push('teams');

  // 6. auth.users — must be last
  const { error: authErr } = await supabase.auth.admin.deleteUser(team.id);
  if (authErr) errors.push(`auth.users: ${authErr.message}`);
  else tables.push('auth.users');

  return { tables, errors };
}

// ── Mode 1: remove one team at a time ─────────────────────────────────────
async function runSingleMode(): Promise<void> {
  while (true) {
    console.log('\nFetching current seeded teams…');
    const teams = await fetchSeededTeams();

    if (teams.length === 0) {
      console.log('No seeded teams found. Done.\n');
      break;
    }

    console.log(`\nFound ${teams.length} seeded team(s):\n`);
    teams.forEach((t, i) => {
      console.log(
        `  ${String(i + 1).padStart(2)}. ` +
        `[${t.username.padEnd(16)}] ` +
        `${t.name.padEnd(24)} ` +
        `${t.id}`
      );
    });

    const answer = await prompt(
      `\nEnter team number to remove, or "q" to quit: `
    );

    if (answer.toLowerCase() === 'q' || answer === '') break;

    const idx = parseInt(answer, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= teams.length) {
      console.log('⚠️  Invalid selection, try again.');
      continue;
    }

    const target = teams[idx];
    console.log(`\n  Selected: [${target.username}] ${target.name} (${target.id})`);
    const confirm = await prompt('  Confirm removal? [y/N] ');
    if (confirm.toLowerCase() !== 'y') {
      console.log('  Skipped.');
      continue;
    }

    process.stdout.write('  Removing… ');
    const result = await deleteTeam(target);

    if (result.errors.length === 0) {
      console.log('✅  Done');
      console.log(`  Cleaned up: ${result.tables.join(', ')}`);
    } else {
      console.log('⚠️  Completed with errors:');
      for (const e of result.errors) console.log(`    • ${e}`);
      console.log(`  Cleaned up (partial): ${result.tables.join(', ')}`);
    }
  }
}

// ── Mode 2: remove all seeded teams ───────────────────────────────────────
async function runAllMode(): Promise<void> {
  console.log('\nFetching all seeded teams…');
  const teams = await fetchSeededTeams();

  if (teams.length === 0) {
    console.log('No seeded teams found. Nothing to do.\n');
    return;
  }

  console.log(`\nAbout to remove ALL ${teams.length} seeded team(s) and all their data:\n`);
  teams.forEach((t) => {
    console.log(`  • [${t.username.padEnd(16)}] ${t.name}`);
  });

  const confirm = await prompt(
    `\n⚠️  This is IRREVERSIBLE. Type "delete all" to confirm: `
  );
  if (confirm !== 'delete all') {
    console.log('Aborted — nothing was deleted.\n');
    return;
  }

  console.log('');
  let totalOk = 0;
  let totalErr = 0;

  for (const team of teams) {
    process.stdout.write(`  [${team.username.padEnd(14)}] `);
    const result = await deleteTeam(team);
    if (result.errors.length === 0) {
      process.stdout.write('✅  removed\n');
      totalOk++;
    } else {
      process.stdout.write(`⚠️  partial (${result.errors.join('; ')})\n`);
      totalErr++;
    }
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  ✅  Removed cleanly : ${totalOk}`);
  console.log(`  ⚠️  Partial/errors  : ${totalErr}`);
  console.log(`${'─'.repeat(50)}\n`);
}

// ── Entry point ───────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log('\n🗑️   Guilty-by-Data — Team Cleanup Tool');
  console.log(`    URL : ${SUPABASE_URL}\n`);

  console.log('Choose cleanup mode:\n');
  console.log('  1. Remove one team at a time (interactive loop)');
  console.log('  2. Remove ALL seeded teams and all their data\n');

  const choice = await prompt('Enter 1 or 2: ');

  if (choice === '1') {
    await runSingleMode();
  } else if (choice === '2') {
    await runAllMode();
  } else {
    console.log('Invalid choice. Exiting.');
    process.exit(1);
  }

  closeRL();
  console.log('Goodbye.\n');
}

void main();
