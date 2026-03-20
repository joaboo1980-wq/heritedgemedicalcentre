-- Add doctor_examination module to role_permissions for all roles
-- This allows control over viewing, creating, editing, and deleting medical examinations

INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES
('admin', 'doctor_examination', true, true, true, true),
('doctor', 'doctor_examination', true, true, true, true),
('nurse', 'doctor_examination', true, false, false, false),
('receptionist', 'doctor_examination', false, false, false, false),
('lab_technician', 'doctor_examination', false, false, false, false),
('pharmacist', 'doctor_examination', false, false, false, false);
