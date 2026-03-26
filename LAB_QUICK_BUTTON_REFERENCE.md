# Lab Dashboard - Quick Button Reference

## All Buttons by State

### 📋 PENDING (Awaiting Sample Collection)
| Button | Handler | Action | Result |
|--------|---------|--------|--------|
| Process | `handleProcess(order)` | Opens sample collection modal | → SAMPLE_COLLECTED |
| Reject | `handleReject(order.id)` | Opens rejection modal | → REJECTED |
| Details | `handleViewDetails(order)` | Shows test details | (read-only) |

---

### 🧪 SAMPLE_COLLECTED (Ready for QC/Testing)
| Button | Handler | Action | Result |
|--------|---------|--------|--------|
| Start Testing | `handleStartTesting(order.id)` | Updates status directly, NO modal | → IN_PROGRESS |
| Reject | `handleReject(order.id)` | Opens rejection modal | → REJECTED |
| Details | `handleViewDetails(order)` | Shows test details | (read-only) |

---

### ⚙️ IN_PROGRESS (Analyzer Running)
| Button | Handler | Action | Result |
|--------|---------|--------|--------|
| Cancel | `handleCancel(order.id)` | Marks test as cancelled | → CANCELLED |
| Details | `handleViewDetails(order)` | Shows test details | (read-only) |

---

### ✓ COMPLETED (Results Ready, Awaiting Verification)
| Button | Handler | Action | Result |
|--------|---------|--------|--------|
| Review Results | `handleViewDetails(order)` | Shows test details with results | (read-only) |
| Details | `handleViewDetails(order)` | Same as Review Results | (read-only) |

---

### 🔍 NEEDS_VERIFY (Awaiting Supervisor Approval)
| Button | Handler | Action | Result |
|--------|---------|--------|--------|
| Verify Results | `handleVerify(order.id)` | Approves results, sets verified_by + verified_at | → VERIFIED |
| Details | `handleViewDetails(order)` | Shows test details for review | (read-only) |

---

### ✅ VERIFIED (Approved, Ready to Send to Doctor)
| Button | Handler | Action | Result |
|--------|---------|--------|--------|
| Report Results | `handleReport(order.id)` | Sends results to doctor | → REPORTED |
| Details | `handleViewDetails(order)` | Shows verified test details | (read-only) |

---

### ❌ REJECTED (Sample/Test Rejected)
| Button | Handler | Action | Result |
|--------|---------|--------|--------|
| Details | `handleViewDetails(order)` | Shows rejection reason and details | (read-only) |

---

## Handler Functions - What They Do

### handleProcess(order)
```typescript
// Opens modal for sample collection
setSelectedOrder(order)
setSampleCollectionStatus('pending_collection')
setShowSampleModal(true)
// User selects "Sample Collected" in dropdown
// User clicks "Confirm"
// → handleSampleCollection() runs
```

### handleSampleCollection()
```typescript
// Called when user confirms sample collection in modal
UPDATE lab_orders SET status = 'sample_collected' WHERE id = selectedOrder.id
TOAST: "Sample marked as collected."
// Clears modal
REFETCH: Updates all data
// Test moves to SAMPLE_COLLECTED tab
```

### handleStartTesting(orderId)
```typescript
// Called when "Start Testing" button clicked
UPDATE lab_orders SET status = 'in_progress' WHERE id = orderId
TOAST: "Testing started."
REFETCH: Updates all data
// Test moves to IN_PROGRESS tab
// NO modal opens - direct state change
```

### handleReject(orderId)
```typescript
// Opens rejection reason modal
setSelectedOrder(order with this ID)
setRejectionReason('')
setShowRejectModal(true)
// User selects reason from dropdown or enters custom
// User clicks "Confirm Rejection"
// → handleConfirmReject() runs
```

### handleConfirmReject()
```typescript
// Called when user confirms rejection in modal
GET currentUser = supabase.auth.getUser()
UPDATE lab_orders SET (
  status = 'rejected',
  rejection_reason = entered reason,
  rejected_by = currentUser.id,
  rejected_at = NOW()
) WHERE id = selectedOrder.id
TOAST: "Sample rejected. Reason: [reason text]"
// Clears modal
REFETCH: Updates all data
// Test moves to REJECTED tab
```

### handleVerify(orderId)
```typescript
// Called when "Verify Results" button clicked
GET currentUser = supabase.auth.getUser()
UPDATE lab_orders SET (
  status = 'verified',
  verified_by = currentUser.id,
  verified_at = NOW()
) WHERE id = orderId
TOAST: "Results verified and approved."
REFETCH: Updates all data
// Test moves from COMPLETED to VERIFIED tab
// NO modal opens - direct state change
```

### handleReport(orderId)
```typescript
// Called when "Report Results" button clicked
UPDATE lab_orders SET status = 'reported' WHERE id = orderId
TOAST: "Results reported to doctor."
REFETCH: Updates all data
// Test moves from VERIFIED to REPORTED state
// NO modal opens - direct state change
```

### handleCancel(orderId)
```typescript
// Called when "Cancel" button clicked
UPDATE lab_orders SET status = 'cancelled' WHERE id = orderId
TOAST: "Lab order cancelled."
REFETCH: Updates all data
// Test disappears from IN_PROGRESS tab
// NO modal opens - direct state change
```

### handleViewDetails(order)
```typescript
// Opens details modal
setSelectedOrder(order)
setShowDetails(true)
// Displays:
// - Test name
// - Patient name
// - Order number
// - Priority
// - Status
// - Order date
// - IF REJECTED:
//   - Rejection reason (highlighted in red)
//   - Rejection timestamp
// - IF VERIFIED:
//   - Verified by (user name)
//   - Verified at (timestamp)
```

---

## Modals

### Rejection Modal
```
Title: "Reject Sample/Test"

Test Details (read-only):
- Test name
- Patient name
- Order number

Rejection Reason Dropdown:
- Insufficient sample volume
- Hemolyzed sample
- Clotted sample
- Wrong sample type
- Contaminated sample
- Mislabeled specimen
- Sample integrity compromised
- QC failed
- Equipment malfunction

Custom Reason Text Area:
- Free text override (can replace dropdown selection)

Warning Box:
"⚠️ Note: This action will reject the sample and require 
the patient to provide a new sample. The reason will be 
recorded for audit purposes (ISO 15189)."

Buttons:
- [Cancel] - Closes modal without saving
- [Confirm Rejection] - Saves and moves to REJECTED tab
  (Disabled if no reason provided)
```

### Sample Collection Modal
```
Title: "Sample Collection"

Test Details (read-only):
- Test name
- Order number
- Patient name

Status Dropdown:
- Pending Collection
- Sample Collected ← Select this to mark collected
- Processing

Information Box:
"Note: Mark as 'Sample Collected' once the patient 
has provided their sample."

Buttons:
- [Cancel] - Closes modal without saving
- [Confirm] - Updates status and moves to SAMPLE_COLLECTED tab
```

### Details Modal
```
Title: "Lab Test Details"

Content (read-only):
- Test: [test name]
- Patient: [patient name]
- Order Number: [order #]
- Priority: [urgent/routine]
- Status: [current status]
- Ordered At: [date/time]

IF REJECTED (highlighted red box):
- Rejection Reason: [reason text]
- Rejected: [date/time]

Button:
- [Close] - Closes modal
```

---

## State Transition Diagram

```
START
  │
  ├─ CREATE NEW ORDER
  │       ↓
  └─► PENDING ◄─────────────[Reject] 
        │                       │
        ├─ [Process]            │
        │     ↓                  │
        ├─► SAMPLE_COLLECTED ◄──┤
        │     │                 │
        │     ├─ [Start Testing] │
        │     │     ↓            │
        │     ├─► IN_PROGRESS   │
        │     │     │            │
        │     │     ├─ [Cancel]  │
        │     │     │     ↓      │
        │     │     │   CANCELLED│
        │     │     │            │
        │     │     ├─ [Auto-complete after test run]
        │     │     ↓            │
        │     └─► COMPLETED      │
        │           │            │
        │           ├─ [Verify Results - if approved]
        │           │     ↓      │
        │           └─► VERIFIED │
        │                 │      │
        │                 ├─ [Report Results]
        │                 ↓      │
        │              REPORTED  │
        │                        │
        └───────────────────────► REJECTED
```

---

## Quick Troubleshooting

| Problem | Button/State | Check |
|---------|--------------|-------|
| "Start Testing" opens modal | SAMPLE_COLLECTED | Should call `handleStartTesting()` not `handleProcess()` |
| "Verify Results" opens rejection modal | NEEDS_VERIFY | Should call `handleVerify()` not `handleReject()` |
| "Report Results" opens rejection modal | VERIFIED | Should call `handleReport()` not `handleReject()` |
| Rejection modal won't confirm | Any state | Check reject reason is not empty |
| Test doesn't move to next state | Any button | Check browser console for error messages |
| Toast notification missing | Any action | Check `useToast()` hook is imported and working |
| Test appears in wrong tab | Filtering | Tab filter might be incorrect - check activeFilter state |
| Rejection reason not saved | REJECTED tab | Check database migration was applied (`rejection_reason` column must exist) |

---

## Column Mapping

**Database Columns Used:**
- `id` - Test ID
- `order_number` - Order reference
- `status` - Current state (8 values)
- `priority` - Urgent/Routine
- `created_at` - Order creation timestamp
- `rejection_reason` - Text reason if rejected
- `rejected_by` - User ID who rejected (for audit)
- `rejected_at` - When rejected (for audit)
- `verified_by` - User ID who verified (for audit)
- `verified_at` - When verified (for audit)
- `is_abnormal` - Boolean for abnormal results

**Query Result Columns Fetched:**
```javascript
SELECT: [
  id,
  order_number,
  status,
  priority,
  created_at,
  rejection_reason,
  rejected_at,
  verified_at,
  patients (first_name, last_name),
  lab_tests (test_name)
]
```

---

**Last Updated:** March 26, 2025  
**Component Status:** ✅ All handlers functional
