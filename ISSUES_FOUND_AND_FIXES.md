# Health System Issues Found and Fixes Applied

## Critical Issues Identified and Fixed

### 1. ✅ FIXED: useQuery Hook Error Handling (useDashboard.tsx)
**Issue**: All dashboard hooks missing try-catch blocks and error handling
- `usePatientTrend()` - No error logging, silently fails
- `useDepartmentDistribution()` - No error handling, returns placeholder on empty data
- `useRecentAppointments()` - Throws immediately on error, no recovery
- `useWeeklyAppointments()` - No error handling
- `useActivityLog()` - Multiple API calls without error handling

**Fixes Applied**:
- ✅ Added try-catch blocks to all queryFn functions
- ✅ Added proper error logging with [Dashboard] prefix
- ✅ Return empty arrays or fallback data instead of throwing
- ✅ Added error handling for individual query failures within loops

---

### 2. ✅ FIXED: DoctorDashboard Query Error Handling
**Issues Found**:
- Appointments query: Missing try-catch, no error logging
- Patients query: Direct throw without logging
- Prescriptions query: Error handling missing, nested map could fail
- Lab results query: No error recovery
- Medical examinations: No try-catch
- Patient examinations: Missing error handling
- All mutations: No error context in onError callbacks

**Fixes Applied**:
- ✅ Added try-catch blocks to all 6 query functions
- ✅ Added console.error logging with [DoctorDashboard] prefix
- ✅ Enhanced mutation error callbacks with error message display
- ✅ Added re-throw for proper error propagation to React Query

---

### 3. 🔴 CRITICAL: AdminAppointments.tsx
**Issues**:
- Fetches without nested relationships properly (patients/doctors)
- No error toast notifications
- Multiple separate queries that should be optimized
- Missing error boundaries

**Recommended Fixes**:
```tsx
// Current: Multiple separate queries
// Better: Use nested Select with proper error handling
const { data, error } = await supabase
  .from('appointments')
  .select(`
    id, status, appointment_date, appointment_time,
    patients(first_name, last_name),
    profiles!appointments_doctor_id_fkey(full_name)
  `)
  .order('appointment_date', { ascending: false });

if (error) {
  console.error('[AdminAppointments] Error fetching:', error);
  toast.error('Failed to load appointments');
  throw error;
}
```

---

### 4. 🔴 CRITICAL: Appointments.tsx
**Issues**:
- Doctor role fetching without proper error handling
- No validation before form submission
- Multiple queries without error recovery
- Doctor rendering could fail with null checks

**Recommended Fixes**:
- Add validation in mutation.mutationFn before API call
- Wrap role fetching in try-catch
- Add proper null coalescing: `?? 'No Doctor'`

---

### 5. 🔴 CRITICAL: Patients.tsx
**Issues**:
- Patient edit mutation missing error details
- Delete dialog not handling errors gracefully
- Medical history fetch without error handling
- Search not validated

**Recommended Fixes**:
- Add error message parsing in mutation onError
- Validate search term before API call
- Add try-catch to medical history query

---

### 6. 🔴 CRITICAL: Billing.tsx
**Issues**:
- Invoice creation without validation
- No error handling for invoice item mutations
- Missing error toasts for several operations
- Form data not validated before submission

**Recommended Fixes**:
- Validate patient_id, due_date, items before insert
- Add error messages in all mutation onError callbacks
- Add validation function before form submission

---

### 7. 🔴 CRITICAL: ReceptionDashboard.tsx
**Issues**:
- Unused imports and incomplete implementation
- Patient queue query uses placeholder room/status data
- Missing handler implementations (TODO comments)
- Waiting patients query has empty logic

**Recommended Fixes**:
```tsx
// Instead of static room assignment:
// room: 100 + idx, (WRONG - doesn't match actual data)
// Better: fetch from appointments table with room_number or wait_status field
```

---

### 8. 🔴 CRITICAL: PharmacyDashboard.tsx  
**Issues**:
- LowStockMedications comparison doesn't work: `lt('stock_quantity', 'reorder_level')`
  - Can't compare column to column in Supabase filter
- Stats counts may be inaccurate
- Missing error handling in all hooks

**Recommended Fixes**:
```tsx
// Current (WRONG):
.lt('stock_quantity', 'reorder_level')

// Better: Fetch all and filter client-side
const { data } = await supabase
  .from('medications')
  .select('id, stock_quantity, reorder_level, name');

const lowStock = (data || []).filter(m => m.stock_quantity < m.reorder_level);
```

---

### 9. 🔴 CRITICAL: LaboratoryDashboard.tsx
**Issues**:
- Hardcoded stats: `completedToday = 1` (WRONG)
- Hardcoded equipment status: `equipmentStatus = 75` (WRONG)  
- No actual data fetching for completed tests count
- Test processing handlers marked TODO
- No error boundaries

**Recommended Fixes**:
```tsx
// Add proper query for completed tests today
useQuery({
  queryKey: ['completed-tests-today'],
  queryFn: async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const { count, error } = await supabase
      .from('lab_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('updated_at', `${today}T00:00:00`)
      .lte('updated_at', `${today}T23:59:59`);
    
    if (error) throw error;
    return count || 0;
  }
})
```

---

### 10. 🔴 CRITICAL: NursingDashboard.tsx
**Issues**:
- TODO: Vitals table not wired (commented out code)
- TODO: Medication_admin table not wired
- Hardcoded stats: `2 medications due`, `8 vitals recorded`
- Patient queue room assignment is placeholder
- No actual medication/vitals persistence

---

### 11. 🔴 CRITICAL: Laboratory.tsx & Pharmacy.tsx
**Issues**:
- Large files with potentially missing error handling in mutations
- Form validation may be incomplete
- Lab order result posting needs error recovery

---

### 12. 🔴 CRITICAL: Staff.tsx  
**Issues**:
- Large complex page with multiple dialogs
- Potential null reference issues in dropdown rendering
- Duty roster mutation may lack error handling

---

### 13. 🔴 MEDIUM: ReceptionDashboard Waiting Patients
**Issue**: Empty query logic
```tsx
const { data: waitingPatients } = useQuery({
  queryFn: async () => {
    const { data, error } = await supabase
      .from('appointments')
      .select('id, patient_id, doctor_id')
      .eq('appointment_date', today)
      .eq('status', 'waiting') as { data: any; error: any };
    if (error) throw error;
    // REST OF LOGIC IS INCOMPLETE - NO MAPPING/RETURN
```

---

## Summary of Fixes Applied

### Fixed: ✅
1. useDashboard.tsx - All hooks with error handling
2. DoctorDashboard.tsx - All 6 queries + 3 mutations with error handling

### Needs Fixes: 🔴
1. AdminAppointments.tsx - Error handling in appointments query
2. Appointments.tsx - Doctor role fetching, form validation
3. Patients.tsx - Edit/delete mutations error handling
4. Billing.tsx - Form validation, mutation error handling
5. ReceptionDashboard.tsx - Complete patient queue logic, add waiting patients mapping
6. PharmacyDashboard.tsx - Fix reorder_level comparison query
7. LaboratoryDashboard.tsx - Replace hardcoded stats with real queries
8. NursingDashboard.tsx - Wire vitals/medication tables, remove hardcoded stats
9. Laboratory.tsx - Review mutations for error handling
10. Pharmacy.tsx - Review mutations for error handling
11. Staff.tsx - Review dialog/mutation error handling

---

## Generic Error Handling Pattern (Apply Everywhere)

```tsx
const { data, error } = await supabase
  .from('table_name')
  .select('*');

if (error) {
  console.error('[ComponentName] Error fetching data:', error);
  throw error;
}
```

For mutations:
```tsx
const mutation = useMutation({
  mutationFn: async (payload) => {
    try {
      const { error } = await supabase.from('table').insert(payload);
      if (error) throw error;
    } catch (err) {
      console.error('[Component] Insert error:', err);
      throw err;
    }
  },
  onError: (error: any) => {
    toast.error(error?.message || 'Operation failed');
  }
});
```

---

## Next Steps

1. Apply error handling to Appointments.tsx queries
2. Fix PharmacyDashboard column comparison issue
3. Replace hardcoded stats in LaboratoryDashboard and NursingDashboard
4. Complete ReceptionDashboard waiting patients logic
5. Add form validation to all form pages
6. Review all mutations for proper error feedback

