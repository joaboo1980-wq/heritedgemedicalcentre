-- Create submitted_reports table for staff submissions and admin review
CREATE TABLE IF NOT EXISTS public.submitted_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  report_type TEXT NOT NULL, -- 'patient_flow', 'service_utilization', 'clinical_indicators', 'staff_utilization', 'disease_frequency', 'department_report'
  report_title TEXT NOT NULL,
  report_data JSONB NOT NULL, -- Store the actual report data
  summary TEXT, -- Brief summary of the report
  status TEXT NOT NULL DEFAULT 'pending', -- pending, reviewed, approved, rejected
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_comments TEXT,
  performance_rating INTEGER, -- 1-5 for appraisal
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.submitted_reports ENABLE ROW LEVEL SECURITY;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_submitted_reports_updated_at ON public.submitted_reports;
CREATE TRIGGER update_submitted_reports_updated_at
BEFORE UPDATE ON public.submitted_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policy: Users can view their own reports
DROP POLICY IF EXISTS "users_view_own_reports" ON public.submitted_reports;
CREATE POLICY "users_view_own_reports" ON public.submitted_reports
FOR SELECT USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS Policy: Users can create their own reports
DROP POLICY IF EXISTS "users_create_own_reports" ON public.submitted_reports;
CREATE POLICY "users_create_own_reports" ON public.submitted_reports
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Admins can update all reports
DROP POLICY IF EXISTS "admins_update_all_reports" ON public.submitted_reports;
CREATE POLICY "admins_update_all_reports" ON public.submitted_reports
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_submitted_reports_user_id ON public.submitted_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_submitted_reports_status ON public.submitted_reports(status);
CREATE INDEX IF NOT EXISTS idx_submitted_reports_submitted_at ON public.submitted_reports(submitted_at DESC);
