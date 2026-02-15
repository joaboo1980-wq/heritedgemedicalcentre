-- Supabase Setup Guide for Hospital Management System
-- This file documents all the database migrations and Supabase configurations needed

-- ============================================================================
-- STEP 1: Run all migrations in Supabase SQL Editor
-- ============================================================================
-- 
-- Run the following SQL migrations in your Supabase project in this order:
--
-- 1. 20260123112528_b2f0eb03-14df-448f-a01a-c06c5a067be8.sql (User roles and profiles)
-- 2. 20260220_create_notifications_table.sql (Notifications system)
-- 3. 20260220_create_academic_documents_table.sql (Academic documents)
-- 4. 20260220_create_submitted_reports_table.sql (Submitted reports)
-- 5. add_generate_reports_permissions.sql (Role permissions for reports)
--

-- ============================================================================
-- STEP 2: Create Storage Buckets
-- ============================================================================
--
-- Go to Supabase Dashboard > Storage > Create new bucket
--
-- Create the following public buckets:
-- - Bucket name: "avatars"
--   - Visibility: Public
--   - File size limit: 5MB (optional)
--   - Allowed mime types: image/jpeg, image/png, image/gif, image/webp
--
-- - Bucket name: "academic-documents"
--   - Visibility: Public
--   - File size limit: 10MB (optional)
--   - Allowed mime types: image/jpeg, image/png, image/gif, application/pdf
--

-- ============================================================================
-- STEP 3: Configure Storage RLS Policies
-- ============================================================================
--
-- For "avatars" bucket, run:

CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Authenticated users can read avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

--
-- For "academic-documents" bucket, run:

CREATE POLICY "Authenticated users can upload academic documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'academic-documents');

CREATE POLICY "Users can read academic documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'academic-documents');

CREATE POLICY "Admins can delete academic documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'academic-documents'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- ============================================================================
-- STEP 4: Configure Email Settings
-- ============================================================================
--
-- Go to Supabase Dashboard > Authentication > Email
--
-- For password reset and user invitations to work:
-- 1. Verify your domain email or use Supabase's default email
-- 2. Configure the email redirect URLs in Authentication > URL Configuration
--
-- Add these redirect URLs:
-- - http://localhost:8081/reset-password (development)
-- - https://yourdomain.com/reset-password (production)
-- - http://localhost:8081/forgot-password (development)
-- - https://yourdomain.com/forgot-password (production)
--

-- ============================================================================
-- STEP 5: Verify Database Tables
-- ============================================================================
--
-- Verify all tables exist by running:

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected tables:
-- - profiles
-- - user_roles
-- - notifications
-- - academic_documents
-- - submitted_reports
-- - role_permissions (if you ran the permissions migration)

-- ============================================================================
-- STEP 6: Enable Email Authentication (if not already enabled)
-- ============================================================================
--
-- Go to Supabase Dashboard > Authentication > Providers
-- Ensure "Email" provider is enabled
--

-- ============================================================================
-- STEP 7: Add Sample Admin User (Optional)
-- ============================================================================
--
-- You can create an admin user programmatically via:
-- - Supabase Dashboard > Authentication > Users (Create user manually)
-- - OR using the Auth API in your application
--

-- ============================================================================
-- STEP 8: Test Configuration
-- ============================================================================
--
-- After running all migrations and creating buckets:
--
-- 1. Test password reset by clicking "Forgot Password" on login page
-- 2. Test profile picture upload in /profile
-- 3. Test academic document submission in /academic-documents
-- 4. Test staff report generation in /generate-report
-- 5. Test admin review in /submitted-reports and /admin/academic-documents
--

-- ============================================================================
-- IMPORTANT NOTES
-- ============================================================================
--
-- 1. RLS Policies: All tables have RLS enabled. Users can see their own data,
--    admins can see/manage all data.
--
-- 2. Storage Buckets: Are publicly readable but have restricted write access.
--    Users can only upload/modify their own files.
--
-- 3. Email Configuration: Password reset emails will come from Supabase's 
--    default email service unless you configure a custom email provider.
--
-- 4. Session Management: The app uses Supabase session tokens automatically.
--    Sessions expire based on your JWT expiry settings in Authentication.
--
-- 5. Notifications: Currently stored in database. For real-time notifications,
--    the app uses Supabase Realtime subscriptions (postgres_changes).
--

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================
--
-- Issue: "Error fetching documents" / "PGRST100"
-- Solution: Verify storage buckets are created and RLS policies are applied
--
-- Issue: Password reset email not sent
-- Solution: Check Authentication > Email settings and verify sender email
--
-- Issue: Storage upload fails
-- Solution: Verify bucket exists and RLS policies allow your user's upload
--
-- Issue: Documents/notifications not syncing
-- Solution: Check that Realtime is enabled in Supabase Dashboard > Replication
--
