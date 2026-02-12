import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigrations() {
  const migrationsPath = './supabase/migrations';
  const migrationFiles = fs
    .readdirSync(migrationsPath)
    .filter(f => f.endsWith('.sql') && f.includes('nursing'))
    .sort();

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsPath, file);
    const sql = fs.readFileSync(filePath, 'utf-8');
    
    console.log(`Applying migration: ${file}`);
    try {
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        console.error(`Error applying ${file}:`, error);
      } else {
        console.log(`✓ Successfully applied ${file}`);
      }
    } catch (err) {
      console.error(`Exception applying ${file}:`, err.message);
    }
  }
}

applyMigrations();
