import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://krhpwnjcwmwpocfkthog.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyaHB3bmpjd213cG9jZmt0aG9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5ODYzMzEsImV4cCI6MjA4NDU2MjMzMX0._C8omYNoo1dXGcZyn6F7nmnhTrOEgTeptZtLJuyypc0';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const roles = [
  { role: 'doctor', can_view: true, can_create: false, can_edit: false, can_delete: false },
  { role: 'receptionist', can_view: true, can_create: false, can_edit: false, can_delete: false },
  { role: 'lab_technician', can_view: true, can_create: false, can_edit: false, can_delete: false },
  { role: 'nurse', can_view: true, can_create: false, can_edit: false, can_delete: false },
  { role: 'pharmacist', can_view: true, can_create: false, can_edit: false, can_delete: false },
  { role: 'admin', can_view: true, can_create: true, can_edit: true, can_delete: true },
];

console.log('Adding dashboard permissions for all roles...\n');

for (const roleData of roles) {
  try {
    // Try to insert, if exists it will error but that's ok
    const { error: insertError } = await supabase
      .from('role_permissions')
      .upsert({
        role: roleData.role,
        module: 'dashboard',
        can_view: roleData.can_view,
        can_create: roleData.can_create,
        can_edit: roleData.can_edit,
        can_delete: roleData.can_delete,
      });

    if (insertError) {
      console.error(`❌ Error for ${roleData.role}:`, insertError);
    } else {
      console.log(`✅ Added/Updated dashboard permission for ${roleData.role}`);
    }
  } catch (err) {
    console.error(`Error processing ${roleData.role}:`, err);
  }
}

console.log('\n✅ Dashboard permissions setup complete!');
