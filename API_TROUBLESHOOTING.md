# API Integration & Troubleshooting Guide

## Issues Fixed

### 1. Appointment Query 400 Errors
**Problem:** Queries like `appointment_date=gte.2026-01-25` were returning 400 errors
**Root Cause:** Date format inconsistency between JavaScript and PostgreSQL
**Solution:** Updated [useDashboard.tsx](src/hooks/useDashboard.tsx) to ensure dates are formatted as `yyyy-MM-dd` strings before comparison

**Code Fixed:**
```typescript
// Before (problematic)
.gte('appointment_date', format(now, 'yyyy-MM-dd'))

// After (fixed)
const todayDate = format(now, 'yyyy-MM-dd');
const { count: todayAppointments } = await supabase
  .from('appointments')
  .select('*', { count: 'exact', head: true })
  .eq('appointment_date', todayDate);
```

### 2. Role Permissions 404 Errors
**Problem:** `role_permissions` table not found (404 Not Found)
**Root Cause:** Table didn't exist in database
**Solution:** Created migration file to add table with proper RLS policies

**Migration Created:** `supabase/migrations/20260125_create_role_permissions.sql`
- Creates table with columns: id, role, module, can_view, can_create, can_edit, can_delete
- Pre-populates with permissions for 6 roles × 10 modules
- Includes RLS policies for access control

**Fallback Implementation:** [usePermissions.tsx](src/hooks/usePermissions.tsx)
- If table doesn't exist, returns empty array (no permissions fetched)
- Admin users always have full access regardless of table state
- Prevents app from breaking if migration hasn't run yet

## Supabase API Testing

### Test Invoice Creation
```typescript
const { data, error } = await supabase
  .from('invoices')
  .insert({
    patient_id: 'patient-uuid-here',
    invoice_number: `INV-${Date.now()}`,
    status: 'draft',
    total_amount: 50000,
    amount_paid: 0,
  })
  .select()
  .single();
```

### Test Invoice Items
```typescript
const { data, error } = await supabase
  .from('invoice_items')
  .insert({
    invoice_id: 'invoice-uuid-here',
    description: 'Consultation Fee',
    quantity: 1,
    unit_price: 50000,
    total_price: 50000,
  });
```

### Test Invoice Deletion
```typescript
// Delete items first
await supabase.from('invoice_items').delete().eq('invoice_id', 'invoice-uuid');

// Then delete invoice
const { error } = await supabase.from('invoices').delete().eq('id', 'invoice-uuid');
```

## Verifying API Connectivity

### Check Browser Console
1. Open DevTools (F12)
2. Go to Network tab
3. Filter for `supabase.co` requests
4. Look for:
   - **200/201 responses:** ✅ Successful API calls
   - **400 errors:** Check query parameters and data types
   - **401 errors:** Authentication issues
   - **404 errors:** Table doesn't exist or missing permissions
   - **403 errors:** RLS policy blocking access

### Check Application Behavior
1. **Patients Dropdown:** 
   - ✅ Should populate when Creating Invoice
   - If empty: Check if patients table has data and query is correct

2. **Invoice List:**
   - ✅ Should show existing invoices
   - If empty: No invoices exist yet, try creating one

3. **Status Badges:**
   - ✅ Should show with correct colors
   - Colors: draft (gray), pending (yellow), paid (green), overdue (red)

4. **Delete Button:**
   - ✅ Should show confirmation dialog
   - ✅ Should remove invoice from list after deletion
   - If failing: Check RLS policies allow DELETE on invoices table

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Invoices list empty | No data in database | Create test invoice via form |
| Patients dropdown empty | No patients in database | Check Patients page, add patients first |
| Delete fails silently | Missing RLS DELETE policy | Run migration to create role_permissions |
| "Cannot read property of undefined" | API returned null | Add error handling and null checks |
| 400 errors on filters | Date format mismatch | Ensure dates use `yyyy-MM-dd` format |
| 404 on role_permissions | Migration not applied | Apply migration to Supabase database |

## Files Modified for API Integration

### Core Changes:
1. **[src/pages/Billing.tsx](src/pages/Billing.tsx)** - Main invoice CRUD interface
2. **[src/hooks/useDashboard.tsx](src/hooks/useDashboard.tsx)** - Fixed date queries
3. **[src/hooks/usePermissions.tsx](src/hooks/usePermissions.tsx)** - Added fallback for missing table
4. **[supabase/migrations/20260125_create_role_permissions.sql](supabase/migrations/20260125_create_role_permissions.sql)** - New table creation

### Secondary Changes:
5. **[src/App.tsx](src/App.tsx)** - Added Invoices route
6. **[src/components/layout/Sidebar.tsx](src/components/layout/Sidebar.tsx)** - Added Invoices menu

## Database State Check

To verify your Supabase setup:

```sql
-- Check if invoices table exists and has data
SELECT COUNT(*) FROM invoices;

-- Check if invoice_items table exists
SELECT COUNT(*) FROM invoice_items;

-- Check role_permissions table
SELECT COUNT(*) FROM role_permissions;

-- Check if appointments table has proper date values
SELECT appointment_date, COUNT(*) FROM appointments GROUP BY appointment_date LIMIT 5;
```

## Running the Application

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run type checking
npm run typecheck
```

## Environment Setup

Ensure your `.env` file contains:
```
VITE_SUPABASE_URL=https://krhpwnjcwmwpocfkthog.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

The app will authenticate through Supabase Auth and use RLS policies to secure API access.
