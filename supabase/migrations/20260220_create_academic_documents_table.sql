-- Create academic_documents table for staff document submissions
CREATE TABLE IF NOT EXISTS public.academic_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- 'passport_photo', 'degree', 'license', 'certificate', 'other'
  document_title TEXT NOT NULL,
  file_url TEXT NOT NULL, -- URL stored in Supabase storage
  file_size INTEGER, -- in bytes
  file_mime_type TEXT, -- e.g., 'image/jpeg', 'application/pdf'
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.academic_documents ENABLE ROW LEVEL SECURITY;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_academic_documents_updated_at ON public.academic_documents;
CREATE TRIGGER update_academic_documents_updated_at
BEFORE UPDATE ON public.academic_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policy: Users can view their own documents
DROP POLICY IF EXISTS "users_view_own_documents" ON public.academic_documents;
CREATE POLICY "users_view_own_documents" ON public.academic_documents
FOR SELECT USING (auth.uid() = user_id);

-- RLS Policy: Admins can view all documents
DROP POLICY IF EXISTS "admins_view_all_documents" ON public.academic_documents;
CREATE POLICY "admins_view_all_documents" ON public.academic_documents
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS Policy: Users can create their own documents
DROP POLICY IF EXISTS "users_create_own_documents" ON public.academic_documents;
CREATE POLICY "users_create_own_documents" ON public.academic_documents
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Admins can update all documents
DROP POLICY IF EXISTS "admins_update_all_documents" ON public.academic_documents;
CREATE POLICY "admins_update_all_documents" ON public.academic_documents
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS Policy: Users can delete their pending documents
DROP POLICY IF EXISTS "users_delete_pending_documents" ON public.academic_documents;
CREATE POLICY "users_delete_pending_documents" ON public.academic_documents
FOR DELETE USING (auth.uid() = user_id AND status = 'pending');

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_academic_documents_user_id ON public.academic_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_academic_documents_status ON public.academic_documents(status);
CREATE INDEX IF NOT EXISTS idx_academic_documents_submitted_at ON public.academic_documents(submitted_at DESC);
