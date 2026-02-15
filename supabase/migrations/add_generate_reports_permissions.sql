-- Add generate_reports module to role_permissions for all roles
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete)
VALUES
  ('admin', 'generate_reports', true, true, true, true),
  ('doctor', 'generate_reports', true, true, false, false),
  ('nurse', 'generate_reports', true, true, false, false),
  ('receptionist', 'generate_reports', false, false, false, false),
  ('lab_technician', 'generate_reports', true, true, false, false),
  ('pharmacist', 'generate_reports', false, false, false, false)
ON CONFLICT (role, module) DO UPDATE
SET can_view = EXCLUDED.can_view,
    can_create = EXCLUDED.can_create,
    can_edit = EXCLUDED.can_edit,
    can_delete = EXCLUDED.can_delete;
