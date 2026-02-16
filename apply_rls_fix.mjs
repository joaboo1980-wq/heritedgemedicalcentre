import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment variables');
  console.error('Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  const migrationPath = './supabase/migrations/20260216_fix_scheduled_doses_rls_insert.sql';
  
  try {
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('Applying migration: 20260216_fix_scheduled_doses_rls_insert.sql');
    console.log('This adds missing INSERT policies to scheduled_doses table for medicine dispensing...\n');
    
    // Execute raw SQL using Supabase admin API
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('❌ Error applying migration:', error);
      process.exit(1);
    } else {
      console.log('✅ Successfully applied migration!');
      console.log('Medication dispensing should now work correctly.');
      console.log('\nMigration details:');
      console.log('- Added INSERT policy for admins');
      console.log('- Added INSERT policy for pharmacists');
      console.log('- Added INSERT policy for nurses');
    }
  } catch (err) {
    console.error('❌ Exception applying migration:', err.message);
    process.exit(1);
  }
}

applyMigration();
