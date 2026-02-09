-- Add staff_schedule and accounts permissions for all roles

-- Admin permissions
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES
('admin', 'staff_schedule', true, true, true, true)
ON CONFLICT (role, module) DO UPDATE SET can_view=true, can_create=true, can_edit=true, can_delete=true;

-- Doctor permissions
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES
('doctor', 'staff_schedule', true, false, false, false)
ON CONFLICT (role, module) DO UPDATE SET can_view=true, can_create=false, can_edit=false, can_delete=false;

-- Nurse permissions
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES
('nurse', 'staff_schedule', true, false, false, false)
ON CONFLICT (role, module) DO UPDATE SET can_view=true, can_create=false, can_edit=false, can_delete=false;

-- Receptionist permissions
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES
('receptionist', 'staff_schedule', true, true, true, false)
ON CONFLICT (role, module) DO UPDATE SET can_view=true, can_create=true, can_edit=true, can_delete=false;

-- Lab technician permissions
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES
('lab_technician', 'staff_schedule', true, false, false, false)
ON CONFLICT (role, module) DO UPDATE SET can_view=true, can_create=false, can_edit=false, can_delete=false;

-- Pharmacist permissions
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES
('pharmacist', 'staff_schedule', true, false, false, false)
ON CONFLICT (role, module) DO UPDATE SET can_view=true, can_create=false, can_edit=false, can_delete=false;

-- Ensure accounts permissions exist for all roles
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES
('doctor', 'accounts', true, false, false, false),
('nurse', 'accounts', false, false, false, false),
('receptionist', 'accounts', true, false, false, false),
('lab_technician', 'accounts', false, false, false, false),
('pharmacist', 'accounts', false, false, false, false)
ON CONFLICT (role, module) DO NOTHING;
