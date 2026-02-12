import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://krhpwnjcwmwpocfkthog.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_KEY environment variable not set');
  console.error('Please set SUPABASE_SERVICE_KEY to your Supabase service role key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupNursingTables() {
  console.log('Creating nursing_tasks and patient_assignments tables...\n');

  const {error: tasksError} = await supabase.rpc('execute_sql', {
    sql: `CREATE TABLE IF NOT EXISTS public.nursing_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  assigned_nurse_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  assigned_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(50) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'in_progress', 'completed', 'cancelled')),
  due_time TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);`
  });

  if (tasksError) {
    console.error('Error creating nursing_tasks table:', tasksError);
  } else {
    console.log('✓ nursing_tasks table created');
  }

  const {error: assignError} = await supabase.rpc('execute_sql', {
    sql: `CREATE TABLE IF NOT EXISTS public.patient_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  nurse_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  assigned_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  shift_date DATE NOT NULL,
  priority VARCHAR(50) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  is_primary_nurse BOOLEAN DEFAULT false,
  reassigned_from_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reassignment_reason VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(patient_id, nurse_id, shift_date)
);`
  });

  if (assignError) {
    console.error('Error creating patient_assignments table:', assignError);
  } else {
    console.log('✓ patient_assignments table created');
  }

  console.log('\n✓ Nursing tables setup complete!');
}

setupNursingTables().catch(console.error);
