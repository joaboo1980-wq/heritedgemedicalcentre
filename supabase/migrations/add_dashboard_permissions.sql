-- Add missing dashboard permissions for all roles

-- Doctor dashboard permission
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete)
VALUES ('doctor', 'dashboard', true, false, false, false)
ON CONFLICT (role, module) DO UPDATE SET can_view = true, can_create = false, can_edit = false, can_delete = false;

-- Receptionist dashboard permission
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete)
VALUES ('receptionist', 'dashboard', true, false, false, false)
ON CONFLICT (role, module) DO UPDATE SET can_view = true, can_create = false, can_edit = false, can_delete = false;

-- Lab technician dashboard permission
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete)
VALUES ('lab_technician', 'dashboard', true, false, false, false)
ON CONFLICT (role, module) DO UPDATE SET can_view = true, can_create = false, can_edit = false, can_delete = false;

-- Nurse dashboard permission
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete)
VALUES ('nurse', 'dashboard', true, false, false, false)
ON CONFLICT (role, module) DO UPDATE SET can_view = true, can_create = false, can_edit = false, can_delete = false;

-- Pharmacist dashboard permission
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete)
VALUES ('pharmacist', 'dashboard', true, false, false, false)
ON CONFLICT (role, module) DO UPDATE SET can_view = true, can_create = false, can_edit = false, can_delete = false;

-- Admin dashboard permission
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete)
VALUES ('admin', 'dashboard', true, true, true, true)
ON CONFLICT (role, module) DO UPDATE SET can_view = true, can_create = true, can_edit = true, can_delete = true;
