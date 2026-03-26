# Laboratory Dashboard - Sample Rejection Fix

## Issue
The "Failed to reject sample" error occurs when trying to reject a sample in the Laboratory Dashboard.

## Root Causes (Two issues combined)

### 1. **❌ Missing Valid Status in CHECK Constraint** (PRIMARY ISSUE)

The `lab_orders` table has a CHECK constraint that only allows these statuses:
- ✅ `'pending'`
- ✅ `'sample_collected'`
- ✅ `'processing'`
- ✅ `'completed'`
- ✅ `'cancelled'`

But the code tries to use:
- ❌ `'rejected'` → **NOT IN ALLOWED LIST - CAUSES ERROR!**
- ❌ `'in_progress'` → **NOT IN ALLOWED LIST - CAUSES ERROR!**

**When you try to reject a sample, the database rejects the UPDATE because 'rejected' violates the CHECK constraint!**

### 2. **❌ Incomplete RLS UPDATE Policy** (SECONDARY ISSUE)

The RLS UPDATE policy was also missing the `WITH CHECK` clause:

```sql
-- OLD (BROKEN)
CREATE POLICY "Lab staff can update lab orders" ON public.lab_orders FOR UPDATE TO authenticated
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lab_technician'));
   -- ❌ Missing WITH CHECK clause
   -- ❌ Missing doctor and nurse roles
```

## Solution: Apply this SQL in Supabase

### Step-by-Step:
1. Go to https://app.supabase.com/project/krhpwnjcwmwpocfkthog
2. Click **SQL Editor** on the left
3. Click **New Query**
4. **Copy and paste the entire SQL below:**

```sql
-- Fix #1: Add 'rejected' and 'in_progress' to valid statuses
ALTER TABLE public.lab_orders 
DROP CONSTRAINT IF EXISTS lab_orders_status_check;

ALTER TABLE public.lab_orders
ADD CONSTRAINT lab_orders_status_check 
CHECK (status IN ('pending', 'sample_collected', 'in_progress', 'processing', 'completed', 'rejected', 'cancelled'));

-- Fix #2: Fix the RLS UPDATE policy with WITH CHECK clause
DROP POLICY IF EXISTS "Lab staff can update lab orders" ON public.lab_orders;

CREATE POLICY "authorized_staff_can_update_lab_orders"
ON public.lab_orders
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') 
  OR public.has_role(auth.uid(), 'lab_technician')
  OR public.has_role(auth.uid(), 'doctor')
  OR public.has_role(auth.uid(), 'nurse')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') 
  OR public.has_role(auth.uid(), 'lab_technician')
  OR public.has_role(auth.uid(), 'doctor')
  OR public.has_role(auth.uid(), 'nurse')
);
```

5. Click **Run** ▶️

## What Gets Fixed

### Fix #1: Database Constraint
New allowed statuses:
- `'pending'` - Initial state
- `'sample_collected'` - Sample received from patient
- `'in_progress'` - Test is being processed
- `'processing'` - Test processing
- `'completed'` - Test finished
- **`'rejected'`** ← NEW! ✅
- `'cancelled'` - Test cancelled

### Fix #2: RLS Security Policy
- ✅ Adds `WITH CHECK` clause (required by Supabase for UPDATE)
- ✅ Includes doctor, nurse, lab_technician, and admin
- ✅ Both USING and WITH CHECK clauses allow the same roles

## Testing After Fix

1. Go to **Laboratory Dashboard**
2. Click **"Pending Tests"** tab
3. Click **"Reject Sample"** button ← This should now work! ✅
4. Sample moves to **"Rejected"** tab

## Code Context

The LaboratoryDashboard expects these statuses:
- Filter tabs: `'pending' | 'in_progress' | 'completed' | 'rejected'`
- Reject button calls:
```typescript
const { error } = await supabase
  .from('lab_orders')
  .update({ status: 'rejected' })  // ← This status wasn't allowed before!
  .eq('id', orderId);
```

## Files Created
- `supabase/migrations/20260326_fix_lab_orders_status_check.sql` - Migration for constraint
- `supabase/migrations/20260326_fix_lab_orders_update_policy.sql` - Migration for RLS policy
- `LAB_ORDERS_FIX_SQL_EDITOR.sql` - Combined SQL file
