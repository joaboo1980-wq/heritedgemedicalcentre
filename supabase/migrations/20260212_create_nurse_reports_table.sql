-- Create nurse_reports table for tracking submitted reports
CREATE TABLE IF NOT EXISTS public.nurse_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nurse_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  report_data JSONB NOT NULL,
  date_from DATE,
  date_to DATE,
  task_count INT DEFAULT 0,
  completed_count INT DEFAULT 0,
  pending_count INT DEFAULT 0,
  completion_rate INT DEFAULT 0,
  report_type VARCHAR(50) DEFAULT 'summary' CHECK (report_type IN ('summary', 'detailed', 'custom')),
  status VARCHAR(50) DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed', 'archived')),
  reviewed_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  review_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_nurse_reports_nurse_id ON public.nurse_reports(nurse_id);
CREATE INDEX IF NOT EXISTS idx_nurse_reports_status ON public.nurse_reports(status);
CREATE INDEX IF NOT EXISTS idx_nurse_reports_created_at ON public.nurse_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_nurse_reports_reviewed_by_id ON public.nurse_reports(reviewed_by_id);

-- Enable RLS
ALTER TABLE public.nurse_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for nurse_reports

-- Allow admins to do everything
DROP POLICY IF EXISTS "admins_all_nurse_reports" ON public.nurse_reports;
CREATE POLICY "admins_all_nurse_reports" ON public.nurse_reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Allow nurses to view their own reports
DROP POLICY IF EXISTS "nurses_view_own_reports" ON public.nurse_reports;
CREATE POLICY "nurses_view_own_reports" ON public.nurse_reports
  FOR SELECT USING (
    nurse_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Allow nurses to create reports
DROP POLICY IF EXISTS "nurses_create_reports" ON public.nurse_reports;
CREATE POLICY "nurses_create_reports" ON public.nurse_reports
  FOR INSERT WITH CHECK (
    nurse_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'nurse')
    )
  );

-- Allow nurses to update their own reports
DROP POLICY IF EXISTS "nurses_update_own_reports" ON public.nurse_reports;
CREATE POLICY "nurses_update_own_reports" ON public.nurse_reports
  FOR UPDATE USING (
    nurse_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  ) WITH CHECK (
    nurse_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Allow admins to delete reports
DROP POLICY IF EXISTS "admins_delete_reports" ON public.nurse_reports;
CREATE POLICY "admins_delete_reports" ON public.nurse_reports
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
