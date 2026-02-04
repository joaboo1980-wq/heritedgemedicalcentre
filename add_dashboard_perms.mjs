import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Read the SQL file
const sqlFile = path.join(__dirname, 'supabase/migrations/add_dashboard_permissions.sql');
const sql = fs.readFileSync(sqlFile, 'utf-8');

console.log('Executing SQL to add dashboard permissions...');
console.log(sql);

// Execute SQL directly
const { error, data } = await supabase.rpc('exec_sql', { sql });

if (error) {
  console.error('Error executing SQL:', error);
  process.exit(1);
}

console.log('✅ Dashboard permissions added successfully!');
console.log('Data:', data);
