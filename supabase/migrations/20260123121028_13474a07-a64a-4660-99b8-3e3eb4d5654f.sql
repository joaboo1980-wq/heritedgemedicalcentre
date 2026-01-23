-- Create role_permissions table to store what each role can access
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  module TEXT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role, module)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Policies for role_permissions
CREATE POLICY "Admins can manage role permissions"
ON public.role_permissions
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can view role permissions"
ON public.role_permissions
FOR SELECT
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default permissions for all roles and modules
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES
-- Admin has full access to everything
('admin', 'dashboard', true, true, true, true),
('admin', 'patients', true, true, true, true),
('admin', 'appointments', true, true, true, true),
('admin', 'laboratory', true, true, true, true),
('admin', 'pharmacy', true, true, true, true),
('admin', 'billing', true, true, true, true),
('admin', 'reports', true, true, true, true),
('admin', 'staff', true, true, true, true),
('admin', 'user_management', true, true, true, true),

-- Doctor permissions
('doctor', 'dashboard', true, false, false, false),
('doctor', 'patients', true, true, true, false),
('doctor', 'appointments', true, true, true, false),
('doctor', 'laboratory', true, true, false, false),
('doctor', 'pharmacy', true, false, false, false),
('doctor', 'billing', true, false, false, false),
('doctor', 'reports', true, false, false, false),
('doctor', 'staff', true, false, false, false),
('doctor', 'user_management', false, false, false, false),

-- Nurse permissions
('nurse', 'dashboard', true, false, false, false),
('nurse', 'patients', true, true, true, false),
('nurse', 'appointments', true, true, true, false),
('nurse', 'laboratory', true, true, false, false),
('nurse', 'pharmacy', true, false, false, false),
('nurse', 'billing', false, false, false, false),
('nurse', 'reports', false, false, false, false),
('nurse', 'staff', true, false, false, false),
('nurse', 'user_management', false, false, false, false),

-- Receptionist permissions
('receptionist', 'dashboard', true, false, false, false),
('receptionist', 'patients', true, true, true, false),
('receptionist', 'appointments', true, true, true, true),
('receptionist', 'laboratory', false, false, false, false),
('receptionist', 'pharmacy', false, false, false, false),
('receptionist', 'billing', true, true, true, false),
('receptionist', 'reports', false, false, false, false),
('receptionist', 'staff', true, false, false, false),
('receptionist', 'user_management', false, false, false, false),

-- Lab Technician permissions
('lab_technician', 'dashboard', true, false, false, false),
('lab_technician', 'patients', true, false, false, false),
('lab_technician', 'appointments', false, false, false, false),
('lab_technician', 'laboratory', true, true, true, false),
('lab_technician', 'pharmacy', false, false, false, false),
('lab_technician', 'billing', false, false, false, false),
('lab_technician', 'reports', true, false, false, false),
('lab_technician', 'staff', true, false, false, false),
('lab_technician', 'user_management', false, false, false, false),

-- Pharmacist permissions
('pharmacist', 'dashboard', true, false, false, false),
('pharmacist', 'patients', true, false, false, false),
('pharmacist', 'appointments', false, false, false, false),
('pharmacist', 'laboratory', false, false, false, false),
('pharmacist', 'pharmacy', true, true, true, false),
('pharmacist', 'billing', true, true, false, false),
('pharmacist', 'reports', true, false, false, false),
('pharmacist', 'staff', true, false, false, false),
('pharmacist', 'user_management', false, false, false, false);

-- Create function to check module permission
CREATE OR REPLACE FUNCTION public.has_module_permission(
  _user_id UUID,
  _module TEXT,
  _permission TEXT
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = _user_id
      AND rp.module = _module
      AND (
        CASE _permission
          WHEN 'view' THEN rp.can_view
          WHEN 'create' THEN rp.can_create
          WHEN 'edit' THEN rp.can_edit
          WHEN 'delete' THEN rp.can_delete
          ELSE false
        END
      )
  )
$$;