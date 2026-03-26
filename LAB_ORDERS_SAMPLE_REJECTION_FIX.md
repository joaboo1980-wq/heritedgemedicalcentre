# Laboratory Dashboard - Sample Rejection Fix

## Issue
The "Failed to reject sample" error occurs when trying to reject a sample in the Laboratory Dashboard.

## Root Cause
The RLS (Row Level Security) policy for the `lab_orders` table's UPDATE operation is incomplete:

1. **Missing WITH CHECK clause**: Supabase requires both `USING` and `WITH CHECK` clauses for UPDATE operations. The original policy only had a `USING` clause.

2. **Insufficient role permissions**: The UPDATE policy only allowed `admin` and `lab_technician` roles, but doctors and nurses may also need to reject samples.

### Original Policy
```sql
CREATE POLICY "Lab staff can update lab orders" ON public.lab_orders FOR UPDATE TO authenticated
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lab_technician'));
```

This policy is **incomplete** because:
- Missing `WITH CHECK` clause for UPDATE operations
- Only allows specific roles, potentially blocking authorized users

## Solution

### Option 1: Apply via Supabase SQL Editor (Recommended)
1. Go to https://app.supabase.com/project/krhpwnjcwmwpocfkthog
2. Navigate to SQL Editor
3. Create new SQL query
4. Copy the contents of `LAB_ORDERS_FIX_SQL_EDITOR.sql`
5. Click "Run" to execute

### Option 2: Apply via Migration
The migration file `20260326_fix_lab_orders_update_policy.sql` has been created and can be applied via:
```bash
supabase db push
```

## What the Fix Does

Replaces the incomplete policy with a proper one that:

```sql
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

### Key Changes:
- ✅ Adds `WITH CHECK` clause (required for UPDATE operations)
- ✅ Includes `doctor` and `nurse` roles for broader access
- ✅ Maintains security by using role-based access control

## Testing the Fix

After applying the fix:

1. Go to Laboratory Dashboard
2. Navigate to "Pending Tests" tab
3. Click "Reject Sample" on any pending test
4. The sample should now be successfully rejected
5. The test should move to the "Rejected" tab

## Related Code
- **Component**: [src/pages/LaboratoryDashboard.tsx](src/pages/LaboratoryDashboard.tsx#L165-L179)
- **Handler**: `handleReject()` function which calls:
  ```typescript
  const { error } = await supabase
    .from('lab_orders')
    .update({ status: 'rejected' })
    .eq('id', orderId);
  ```

## Files Modified
- `supabase/migrations/20260326_fix_lab_orders_update_policy.sql` - Migration file
- `LAB_ORDERS_FIX_SQL_EDITOR.sql` - Direct SQL for manual execution
