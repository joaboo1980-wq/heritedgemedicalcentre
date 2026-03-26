import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runFixLabOrdersPolicy() {
  try {
    // Read the migration file
    const migrationSQL = fs.readFileSync('./supabase/migrations/20260326_fix_lab_orders_update_policy.sql', 'utf-8');
    
    console.log('Executing lab_orders UPDATE policy fix...');
    console.log('SQL:', migrationSQL);
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL,
    });
    
    if (error) {
      console.error('Error executing SQL:', error);
      process.exit(1);
    }
    
    console.log('✅ Lab orders UPDATE policy fixed successfully!');
    console.log('Response:', data);
    
  } catch (err) {
    console.error('Failed to execute migration:', err);
    process.exit(1);
  }
}

runFixLabOrdersPolicy();
