# Fix: Medication Dispensing RLS Policy Error

## Problem
When trying to dispense medication in the pharmacy, you're getting:
```
Failed to dispense medication: new row violates row-level security policy for table "scheduled_doses"
```

## Root Cause
The `scheduled_doses` table has row-level security (RLS) policies for SELECT and UPDATE operations, but **missing INSERT policies**. When a pharmacist dispenses medication:
1. The prescription status is updated to 'dispensed'
2. A database trigger fires that tries to insert scheduled doses automatically
3. The RLS policy blocks the INSERT because no INSERT policy is defined

## Solution
Apply the SQL migration below to add the missing INSERT policies.

## How to Apply the Fix

### Option 1: Using Supabase SQL Editor (Recommended)

1. Go to: https://app.supabase.com/
2. Navigate to your project: **krhpwnjcwmwpocfkthog**
3. Go to **SQL Editor** section
4. Click **New Query**
5. Copy and paste the SQL below:

```sql
-- Allow admins to insert scheduled doses (via trigger when prescription is dispensed)
DROP POLICY IF EXISTS "admins_insert_doses" ON public.scheduled_doses;
CREATE POLICY "admins_insert_doses" ON public.scheduled_doses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Allow pharmacists to insert scheduled doses (via trigger when they dispense medication)
DROP POLICY IF EXISTS "pharmacists_insert_doses" ON public.scheduled_doses;
CREATE POLICY "pharmacists_insert_doses" ON public.scheduled_doses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'pharmacist'
    )
  );

-- Allow nurses to insert scheduled doses if needed
DROP POLICY IF EXISTS "nurses_insert_doses" ON public.scheduled_doses;
CREATE POLICY "nurses_insert_doses" ON public.scheduled_doses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'nurse'
    )
  );
```

6. Click **Run** button (or use Ctrl+Enter)
7. You should see a success message

### Option 2: Using Supabase CLI (If you have it installed)

```bash
# Run from project directory
supabase migration up
```

## Verification
After applying the fix:
1. Go to Pharmacy > Prescriptions
2. Try to dispense a medication
3. The operation should now succeed without RLS errors

## What the Fix Does
- ✅ Allows pharmacists to trigger medication dispensing (which creates scheduled doses via triggers)
- ✅ Allows nurses to manually insert scheduled doses if needed
- ✅ Allows admins full access to manage scheduled doses
- ✅ No security is compromised - all operations still go through RLS checks

## If You Need More Help
- Check the migration file: `supabase/migrations/20260216_fix_scheduled_doses_rls_insert.sql`
- Review RLS policies: Go to Supabase Dashboard > Authentication > Policies > scheduled_doses
