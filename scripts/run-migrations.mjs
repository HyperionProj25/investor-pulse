// Script to run database migrations on Supabase Cloud
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Load environment variables - fail fast if missing
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  if (!SUPABASE_URL) console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  if (!SERVICE_KEY) console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease set these in your .env.local file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function runSQL(sql, description) {
  console.log(`\n📝 ${description}...`);

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If exec_sql doesn't exist, try direct query
      throw error;
    }

    console.log(`✅ ${description} completed`);
    return true;
  } catch (error) {
    console.log(`⚠️  RPC method not available, trying alternative approach...`);

    // Alternative: Execute via REST API directly
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Profile': 'public',
      },
      body: sql
    });

    if (!response.ok) {
      console.error(`❌ ${description} failed:`, response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return false;
    }

    console.log(`✅ ${description} completed`);
    return true;
  }
}

async function main() {
  console.log('🚀 Running Supabase Migrations...');
  console.log(`📍 Target: ${SUPABASE_URL}\n`);

  // Migration 1: Create table
  const createTableSQL = readFileSync(
    join(projectRoot, 'supabase', 'migrations', '20251209_create_update_schedule_table.sql'),
    'utf-8'
  );

  const success1 = await runSQL(createTableSQL, 'Creating update_schedule_state table');
  if (!success1) {
    console.error('\n❌ Failed to create table. Stopping.');
    process.exit(1);
  }

  // Migration 2: Seed data
  const seedDataSQL = readFileSync(
    join(projectRoot, 'supabase', 'migrations', '20251209_seed_timeline_data.sql'),
    'utf-8'
  );

  const success2 = await runSQL(seedDataSQL, 'Seeding initial timeline data');
  if (!success2) {
    console.error('\n❌ Failed to seed data. Stopping.');
    process.exit(1);
  }

  console.log('\n✨ All migrations completed successfully!');
  console.log('\n📊 Next steps:');
  console.log('  1. Verify the table in Supabase Dashboard > Table Editor');
  console.log('  2. Continue with Phase 2: Building the timeline editor components');
}

main().catch(error => {
  console.error('\n❌ Migration error:', error.message);
  process.exit(1);
});
