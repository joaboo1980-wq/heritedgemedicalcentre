-- Create role_permissions table for fine-grained permission control
CREATE TABLE public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL,
    module TEXT NOT NULL,
    can_view BOOLEAN DEFAULT true,
    can_create BOOLEAN DEFAULT false,
    can_edit BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(role, module)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Staff can view role permissions"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage role permissions"
ON public.role_permissions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default permissions for each role
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES
-- Admin permissions - full access
('admin', 'dashboard', true, true, true, true),
('admin', 'patients', true, true, true, true),
('admin', 'appointments', true, true, true, true),
('admin', 'staff', true, true, true, true),
('admin', 'laboratory', true, true, true, true),
('admin', 'pharmacy', true, true, true, true),
('admin', 'billing', true, true, true, true),
('admin', 'reports', true, true, true, true),
('admin', 'accounts', true, true, true, true),
('admin', 'user_management', true, true, true, true),

-- Doctor permissions
('doctor', 'dashboard', true, true, true, false),
('doctor', 'patients', true, true, true, false),
('doctor', 'appointments', true, true, true, false),
('doctor', 'laboratory', true, true, false, false),
('doctor', 'pharmacy', true, false, false, false),
('doctor', 'billing', true, false, false, false),
('doctor', 'reports', true, false, false, false),

-- Nurse permissions
('nurse', 'dashboard', true, false, false, false),
('nurse', 'patients', true, true, true, false),
('nurse', 'appointments', true, true, false, false),
('nurse', 'laboratory', true, true, false, false),
('nurse', 'pharmacy', true, false, false, false),

-- Receptionist permissions
('receptionist', 'dashboard', true, false, false, false),
('receptionist', 'patients', true, true, false, false),
('receptionist', 'appointments', true, true, true, false),
('receptionist', 'billing', true, true, false, false),

-- Lab technician permissions
('lab_technician', 'dashboard', true, false, false, false),
('lab_technician', 'laboratory', true, true, true, false),
('lab_technician', 'patients', true, false, false, false),

-- Pharmacist permissions
('pharmacist', 'dashboard', true, false, false, false),
('pharmacist', 'pharmacy', true, true, true, false),
('pharmacist', 'patients', true, false, false, false);
