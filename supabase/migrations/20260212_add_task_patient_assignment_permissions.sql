-- Add task_assignment and patient_assignment modules to role_permissions

-- Add permissions for task_assignment module
-- Admin: full access
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES
('admin', 'task_assignment', true, true, true, true)
ON CONFLICT (role, module) DO UPDATE SET
  can_view = true,
  can_create = true,
  can_edit = true,
  can_delete = true;

-- Doctor: can create/view/edit tasks (order interventions)
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES
('doctor', 'task_assignment', true, true, true, false)
ON CONFLICT (role, module) DO UPDATE SET
  can_view = true,
  can_create = true,
  can_edit = true,
  can_delete = false;

-- Nurse: can view and update their assigned tasks
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES
('nurse', 'task_assignment', true, false, true, false)
ON CONFLICT (role, module) DO UPDATE SET
  can_view = true,
  can_create = false,
  can_edit = true,
  can_delete = false;

-- Other roles: no access
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES
('receptionist', 'task_assignment', false, false, false, false)
ON CONFLICT (role, module) DO UPDATE SET
  can_view = false,
  can_create = false,
  can_edit = false,
  can_delete = false;

INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES
('lab_technician', 'task_assignment', false, false, false, false)
ON CONFLICT (role, module) DO UPDATE SET
  can_view = false,
  can_create = false,
  can_edit = false,
  can_delete = false;

INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES
('pharmacist', 'task_assignment', false, false, false, false)
ON CONFLICT (role, module) DO UPDATE SET
  can_view = false,
  can_create = false,
  can_edit = false,
  can_delete = false;

-- Add permissions for patient_assignment module
-- Admin: full access
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES
('admin', 'patient_assignment', true, true, true, true)
ON CONFLICT (role, module) DO UPDATE SET
  can_view = true,
  can_create = true,
  can_edit = true,
  can_delete = true;

-- Doctor: can create/view/edit assignments
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES
('doctor', 'patient_assignment', true, true, true, false)
ON CONFLICT (role, module) DO UPDATE SET
  can_view = true,
  can_create = true,
  can_edit = true,
  can_delete = false;

-- Nurse: can view their assignments
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES
('nurse', 'patient_assignment', true, false, false, false)
ON CONFLICT (role, module) DO UPDATE SET
  can_view = true,
  can_create = false,
  can_edit = false,
  can_delete = false;

-- Other roles: no access
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES
('receptionist', 'patient_assignment', false, false, false, false)
ON CONFLICT (role, module) DO UPDATE SET
  can_view = false,
  can_create = false,
  can_edit = false,
  can_delete = false;

INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES
('lab_technician', 'patient_assignment', false, false, false, false)
ON CONFLICT (role, module) DO UPDATE SET
  can_view = false,
  can_create = false,
  can_edit = false,
  can_delete = false;

INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES
('pharmacist', 'patient_assignment', false, false, false, false)
ON CONFLICT (role, module) DO UPDATE SET
  can_view = false,
  can_create = false,
  can_edit = false,
  can_delete = false;
