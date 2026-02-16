# Verify RLS Policies on scheduled_doses

```sql
-- Run this query in Supabase SQL Editor to see current RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'scheduled_doses'
ORDER BY policyname;
```

## Expected Output After Fix
You should see the following policies:
1. `admins_insert_doses` - FOR INSERT with admin role check
2. `admins_view_all_doses` - FOR SELECT with admin role check
3. `nurses_insert_doses` - FOR INSERT with nurse role check
4. `nurses_update_doses` - FOR UPDATE with nurse assignment check
5. `nurses_view_assigned_doses` - FOR SELECT with nurse assignment/admin check
6. `pharmacists_insert_doses` - FOR INSERT with pharmacist role check

## If policies are missing
The fix hasn't been applied yet. Go to the [detailed instructions](MEDICATION_DISPENSING_RLS_FIX.md).
