-- Create nursing_tasks table
CREATE TABLE IF NOT EXISTS public.nursing_tasks (
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
);

-- Create patient_assignments table
CREATE TABLE IF NOT EXISTS public.patient_assignments (
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
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_nursing_tasks_patient_id ON public.nursing_tasks(patient_id);
CREATE INDEX IF NOT EXISTS idx_nursing_tasks_assigned_nurse_id ON public.nursing_tasks(assigned_nurse_id);
CREATE INDEX IF NOT EXISTS idx_nursing_tasks_status ON public.nursing_tasks(status);
CREATE INDEX IF NOT EXISTS idx_nursing_tasks_due_time ON public.nursing_tasks(due_time);
CREATE INDEX IF NOT EXISTS idx_patient_assignments_patient_id ON public.patient_assignments(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_assignments_nurse_id ON public.patient_assignments(nurse_id);
CREATE INDEX IF NOT EXISTS idx_patient_assignments_shift_date ON public.patient_assignments(shift_date);

-- Enable RLS
ALTER TABLE public.nursing_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for nursing_tasks

-- Allow admins to do everything
DROP POLICY IF EXISTS "admins_all_nursing_tasks" ON public.nursing_tasks;
CREATE POLICY "admins_all_nursing_tasks" ON public.nursing_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Allow nurses to view tasks assigned to them
DROP POLICY IF EXISTS "nurses_view_assigned_tasks" ON public.nursing_tasks;
CREATE POLICY "nurses_view_assigned_tasks" ON public.nursing_tasks
  FOR SELECT USING (
    assigned_nurse_id = auth.uid() OR
    assigned_by_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Allow charge nurses and doctors to create tasks
DROP POLICY IF EXISTS "charge_nurses_create_tasks" ON public.nursing_tasks;
CREATE POLICY "charge_nurses_create_tasks" ON public.nursing_tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'doctor')
    )
  );

-- Allow nurses to update their assigned tasks
DROP POLICY IF EXISTS "nurses_update_own_tasks" ON public.nursing_tasks;
CREATE POLICY "nurses_update_own_tasks" ON public.nursing_tasks
  FOR UPDATE USING (
    assigned_nurse_id = auth.uid() OR
    assigned_by_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  ) WITH CHECK (
    assigned_nurse_id = auth.uid() OR
    assigned_by_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Allow authorized users to delete tasks
DROP POLICY IF EXISTS "authorized_delete_tasks" ON public.nursing_tasks;
CREATE POLICY "authorized_delete_tasks" ON public.nursing_tasks
  FOR DELETE USING (
    assigned_by_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for patient_assignments

-- Allow admins to do everything
DROP POLICY IF EXISTS "admins_all_patient_assignments" ON public.patient_assignments;
CREATE POLICY "admins_all_patient_assignments" ON public.patient_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Allow nurses to view their assignments
DROP POLICY IF EXISTS "nurses_view_own_assignments" ON public.patient_assignments;
CREATE POLICY "nurses_view_own_assignments" ON public.patient_assignments
  FOR SELECT USING (
    nurse_id = auth.uid() OR
    assigned_by_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'doctor', 'nurse')
    )
  );

-- Allow charge nurses and doctors to create assignments
DROP POLICY IF EXISTS "charge_nurses_create_assignments" ON public.patient_assignments;
CREATE POLICY "charge_nurses_create_assignments" ON public.patient_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'doctor')
    )
  );

-- Allow charge nurses and doctors to update assignments
DROP POLICY IF EXISTS "charge_nurses_update_assignments" ON public.patient_assignments;
CREATE POLICY "charge_nurses_update_assignments" ON public.patient_assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'doctor')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'doctor')
    )
  );

-- Allow authorized users to delete assignments
DROP POLICY IF EXISTS "authorized_delete_assignments" ON public.patient_assignments;
CREATE POLICY "authorized_delete_assignments" ON public.patient_assignments
  FOR DELETE USING (
    assigned_by_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
