# Laboratory Dashboard - All 7 States Debug Guide

## State Transition Map with Button Actions

```
1. PENDING                 2. SAMPLE_COLLECTED        3. IN_PROGRESS          4. COMPLETED
   (Awaiting Sample)          (Ready for QC)            (Testing)              (Results Ready)
   
   ├─ Process             ├─ Start Testing ✅       ├─ Cancel              ├─ Review Results (view)
   ├─ Reject              ├─ Reject                 └─ Details            └─ Details
   └─ Details             └─ Details                                       
                                                    
                                                                            ↓ (Tests move to Verification)
                                                                            
                          5. NEEDS_VERIFY (Virtual) 6. VERIFIED            7. REPORTED
                             (Supervisor Review)      (Approved)           (Sent to Doctor)
                             
                             ├─ Verify Results       ├─ Report Results     (Read Only)
                             └─ Details              └─ Details            └─ Details only
```

---

## Detailed State Testing Checklist

### ✅ STATE 1: PENDING - Awaiting Sample Collection

**Tab Location:** "📋 Pending" button

**Sample Data to Test:**
- Create a new lab order
- Should appear in PENDING tab
- Patient name, test type, priority should be visible

**Buttons Available:**
1. **"Process"** - Opens sample collection modal
   - Should show: Test name, Patient name, Order #
   - Dropdown to mark "Sample Collected"
   - Click Confirm → moves to SAMPLE_COLLECTED state

2. **"Reject"** - Opens rejection modal
   - Dropdown with rejection reasons
   - Custom text field
   - Click "Confirm Rejection" → moves to REJECTED state
   - Should record rejection_reason, rejected_by, rejected_at

3. **"Details"** - Shows test details
   - Test name, Patient, Order #, Priority, Status, Order date
   - OK button to close

**Expected Result:**
- ✅ Process button opens modal with sample collection dropdown
- ✅ Selecting "Sample Collected" and confirming moves to SAMPLE_COLLECTED tab
- ✅ Reject button shows dropout with reasons
- ✅ Details button shows test information

---

### ✅ STATE 2: SAMPLE_COLLECTED - Ready for QC/Analysis

**Tab Location:** "🧪 Samples Rcvd" button

**Sample Data to Test:**
- Move a test from PENDING → SAMPLE_COLLECTED via Process button
- Should now appear in "Samples Rcvd" tab
- Shows time sample was received

**Buttons Available:**
1. **"Start Testing"** ← FIXED - NOW WORKS!
   - Directly moves status from sample_collected → in_progress
   - Should show toast: "Testing started."
   - Test disappears from this tab, appears in "In Progress" tab
   - Handler: `handleStartTesting(order.id)`

2. **"Reject"** - Reject at QC stage
   - Opens rejection modal
   - Reasons: Insufficient volume, Hemolyzed, etc.
   - Reason describes WHY QC failed
   - Moves to REJECTED state

3. **"Details"** - View test details

**Expected Result:**
- ✅ Start Testing button moves to IN_PROGRESS tab
- ✅ Toast confirms "Testing started"
- ✅ Reject button works with reason
- ✅ Details shows test info

---

### ✅ STATE 3: IN_PROGRESS - Analyzer Running

**Tab Location:** "⚙️ In Progress" button

**Sample Data to Test:**
- Test moved from SAMPLE_COLLECTED via "Start Testing"
- Should show in this tab
- This is where the analyzer/technician is actively testing

**Buttons Available:**
1. **"Cancel"** - Cancel the running test
   - Moves status to cancelled
   - Shows toast: "Lab order cancelled."
   - Test disappears from IN_PROGRESS
   - Appears in list as cancelled

2. **"Details"** - View test details

**Expected Result:**
- ✅ Cancel button stops the test
- ✅ Test moves to CANCELLED state
- ✅ Details button works

---

### ✅ STATE 4: COMPLETED - Results Ready (Not Yet Verified)

**Tab Location:** "✓ Completed" button

**Sample Data to Test:**
- Skip ahead: Manually update database status to 'completed' for a test
- Should appear here when analyzer finishes
- Results exist but NOT YET approved by supervisor

**Buttons Available:**
1. **"Review Results"** - View test result
   - Opens details modal showing:
     - Test name, Patient, Order #
     - Priority, Status, Order date
     - Result value (if available)
   - No action taken, just viewing

2. **"Details"** - Same as above
   - Both buttons do the same thing (open details)
   - Could be cleaner but functional

**Expected Result:**
- ✅ Results should show test information
- ✅ Both buttons open details (redundant but harmless)
- ✅ Tests stay here until manually moved to VERIFIED

---

### ✅ STATE 5: NEEDS_VERIFY (Virtual Status) - ISO 15189 Gatekeeper

**Tab Location:** "🔍 Needs Verify" button

**How Tests Get Here:**
- Automatically shows completed tests WHERE `verified_at IS NULL`
- This is a virtual state (not in database, calculated by UI filter)

**Sample Data to Test:**
```sql
-- To test, create completed test without verified_at:
UPDATE lab_orders 
SET status = 'completed' 
WHERE id = 'test-id';
-- Should appear in "Needs Verify" tab
```

**Buttons Available:**
1. **"Verify Results"** ← FIXED - NOW WORKS!
   - Officially approves results
   - Handler: `handleVerify(order.id)`
   - Updates:
     - status → 'verified'
     - verified_by → current user ID
     - verified_at → current ISO 8601 timestamp
   - Shows toast: "Results verified and approved."
   - Test moves to VERIFIED tab

2. **"Details"** - View test details for review
   - Shows all test information for supervisor to review

**Expected Result:**
- ✅ Verify Results button approves and moves to VERIFIED
- ✅ Records verified_by (which user approved)
- ✅ Records verified_at (when approved)
- ✅ Toast shows success
- ✅ Test disappears from "Needs Verify" and appears in "Verified"

---

### ✅ STATE 6: VERIFIED - Approved Results

**Tab Location:** "✅ Verified" button

**Sample Data to Test:**
- Tests that have been approved by supervisor
- Status = 'verified' AND verified_at is NOT null
- Safe results ready for doctor

**Buttons Available:**
1. **"Report Results"** ← FIXED - NOW WORKS!
   - Officially sends results to doctor
   - Handler: `handleReport(order.id)`
   - Updates:
     - status → 'reported'
   - Shows toast: "Results reported to doctor."
   - Test moves to REPORTED status

2. **"Details"** - View verified test details

**Expected Result:**
- ✅ Report Results button sends to doctor
- ✅ Moves to REPORTED state
- ✅ Toast confirms
- ✅ Details shows test with verification info

---

### ✅ STATE 7: REPORTED - Sent to Doctor

**Tab Location:** Currently no dedicated tab (REPORTED is end state)

**Sample Data to Test:**
- Tests with status = 'reported'
- Can be viewed by running query:
```sql
SELECT * FROM lab_orders WHERE status = 'reported';
```

**What Appears:**
- Read-only state
- Results delivered to doctor
- No further actions in lab dashboard

---

## State Transition Flow Test Plan

### Test Path 1: Happy Path (Normal Flow)
```
PENDING 
  → Click "Process" 
  → Modal: Select "Sample Collected"
  → Click Confirm
  → Test moves to SAMPLE_COLLECTED ✓
  
  → Click "Start Testing"
  → Test moves to IN_PROGRESS ✓
  
  → [Manually update database: status='completed']
  → Test moves to COMPLETED ✓
  
  → Test appears in NEEDS_VERIFY tab ✓
  → Click "Verify Results"
  → Test moves to VERIFIED ✓
  
  → Click "Report Results"
  → Test moves to REPORTED ✓
```

**Verify Steps:**
1. Check tab displays change as test progresses
2. Verify toasts show correct messages
3. Check browser console for no errors
4. Verify test disappears from old tab, appears in new tab

---

### Test Path 2: Rejection at Each Stage
```
PENDING
  → Click "Reject"
  → Modal: Select "Wrong sample type"
  → Click "Confirm Rejection"
  → Test moves to REJECTED ✓
  → Verify: rejection_reason = "Wrong sample type" in database

SAMPLE_COLLECTED
  → Click "Reject"
  → Modal: Select "Hemolyzed sample"
  → Click "Confirm Rejection"
  → Test moves to REJECTED ✓
  → Details modal shows rejection reason
```

**Verify Steps:**
1. Go to REJECTED tab
2. Click "Details" on rejected test
3. Should see rejection reason displayed
4. Database should have rejection_reason, rejected_by, rejected_at
5. Check browser console for no errors

---

## Common Issues & Fixes

### Issue 1: "Start Testing" Opens Modal Instead of Moving to IN_PROGRESS
**Cause:** Button was calling `handleProcess()` which opens modal
**Fix:** ✅ NOW calls `handleStartTesting()` - moves directly to in_progress
**Test:** Click "Start Testing" in SAMPLE_COLLECTED tab - should NOT open modal

### Issue 2: "Verify Results" Opens Rejection Modal
**Cause:** Button was calling `handleReject()` 
**Fix:** ✅ NOW calls `handleVerify()` 
**Test:** Click "Verify Results" in NEEDS_VERIFY tab - should approve, not reject

### Issue 3: "Report Results" Opens Rejection Modal
**Cause:** Button was calling `handleReject()`
**Fix:** ✅ NOW calls `handleReport()`
**Test:** Click "Report Results" in VERIFIED tab - should send to doctor

---

## Database Verification Queries

```sql
-- Check all states exist
SELECT DISTINCT status, COUNT(*) 
FROM lab_orders 
GROUP BY status;

-- Check rejection tracking
SELECT id, status, rejection_reason, rejected_by, rejected_at
FROM lab_orders 
WHERE status = 'rejected'
LIMIT 5;

-- Check verification tracking
SELECT id, status, verified_by, verified_at
FROM lab_orders 
WHERE status = 'verified'
LIMIT 5;

-- Check reported tests
SELECT id, status
FROM lab_orders 
WHERE status = 'reported'
LIMIT 5;
```

---

## UI Debug Checklist

- [ ] PENDING tab shows pending tests ✓
- [ ] Process button opens sample collection modal ✓
- [ ] Reject button opens rejection modal with reasons ✓
- [ ] Test moves from PENDING → SAMPLE_COLLECTED ✓
- [ ] SAMPLE_COLLECTED tab shows collected samples ✓
- [ ] Start Testing button moves to IN_PROGRESS (no modal) ✓
- [ ] IN_PROGRESS tab shows tests being analyzed ✓
- [ ] Cancel button cancels tests ✓
- [ ] COMPLETED tab shows finished tests ✓
- [ ] NEEDS_VERIFY tab shows completed tests needing approval ✓
- [ ] Verify Results button approves and moves to VERIFIED ✓
- [ ] VERIFIED tab shows approved tests ✓
- [ ] Report Results button moves to REPORTED ✓
- [ ] REJECTED tab shows rejected tests with reasons ✓
- [ ] Details modal shows all relevant info ✓
- [ ] Console has no errors ✓

---

## State Machine Diagram

```
START
  ↓
PENDING ←──────────────────────────────────────┐
  │                                             │
  ├─→ "Process" ─→ SAMPLE_COLLECTED            │
  │                  │                           │
  │                  ├─→ "Start Testing" ─→ IN_PROGRESS
  │                  │                          │
  │                  ├─→ "Reject" ────────┐     │
  │                  │                    │     │
  ├─→ "Reject" ──────┼────────────────────┴──→ REJECTED
  │                  │                         │
  │                COMPLETE (auto)              │
  │                  ↓                          │
  │              COMPLETED ←──── (test finished)
  │                  │                         
  │                  ├─→ "Verify Results" → VERIFIED
  │                  │                          │
  │              (virtual: NEEDS_VERIFY)       │
  │                  │                          │
  └──────────────────┘                         │
                                                │
                              ┌─────────────────┘
                              ↓
                           "Report Results"
                              ↓
                           REPORTED (END)
```

---

## All Changes Made

### Handlers Added/Fixed
- ✅ `handleVerify()` - Moves status to 'verified', records verified_by/verified_at
- ✅ `handleReport()` - Moves status to 'reported'
- ✅ `handleStartTesting()` - Moves from sample_collected to in_progress
- ✅ `handleReject()` - Already existed, records rejection_reason/rejected_by/rejected_at

### Button Fixes
- ✅ SAMPLE_COLLECTED "Start Testing" → calls `handleStartTesting()` (was `handleProcess`)
- ✅ VERIFIED_PENDING "Verify Results" → calls `handleVerify()` (was `handleReject`)
- ✅ VERIFIED "Report Results" → calls `handleReport()` (was `handleReject`)
- ✅ SAMPLE_COLLECTED added "Reject" button
- ✅ COMPLETED cleaned up buttons (both now do same thing - view details)

### Database Columns Already Added
- ✅ `rejection_reason` - Why rejected
- ✅ `rejected_by` - Who rejected (user ID)
- ✅ `rejected_at` - When rejected
- ✅ `verified_by` - Who verified (user ID)
- ✅ `verified_at` - When verified

All 7 states should now work correctly! 🎉
