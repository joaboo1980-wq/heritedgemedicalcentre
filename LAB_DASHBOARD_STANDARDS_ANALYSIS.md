# Laboratory Dashboard Status Workflow - International Standards Analysis

## Current Implementation vs. Standards

### Current Dashboard Tabs (Status Filters)
1. **Pending Tests** - `status = 'pending'`
2. **In Progress** - `status = 'in_progress'`
3. **Completed** - `status = 'completed'`
4. **Rejected** - `status = 'rejected'`

### Database Allowed Statuses (lab_orders table)
```sql
CHECK (status IN (
  'pending',              -- Initial state
  'sample_collected',     -- Physical sample received
  'in_progress',          -- Being processed
  'processing',           -- Alternative processing state (redundant?)
  'completed',            -- Results ready
  'rejected',             -- Sample rejected/failed validation
  'cancelled'             -- Test cancelled
))
```

---

## International Standards Analysis

### ✅ ISO 15189:2022 (Medical Laboratories Accreditation)

Standard Lab Test Lifecycle:
1. **Order Received** (pending) ✅
2. **Sample Received** (sample_collected) ⚠️ Not in tabs
3. **In Analysis** (in_progress) ✅
4. **Analysis Complete** (completed) ✅
5. **Validation** (missing separate status) ❌
6. **Reported** (missing) ❌
7. **Rejected/Cancelled** (rejected) ✅

**Assessment:** Missing critical "Validation" and "Reported" statuses

---

### CLSI/CAP Standards (USA/International)

Recommended Lab Order States:
```
1. PENDING         → Order placed, awaiting sample
2. RECEIVED        → Sample received in lab
3. IN_PROCESS      → Testing underway
4. VERIFIED        → Results verified by lab director
5. COMPLETED       → Final results ready
6. REPORTED        → Results sent to requesting physician
7. CANCELLED       → Order cancelled
8. REJECTED        → Sample unsuitable for analysis
```

**Your Implementation Gap:** Missing VERIFIED and REPORTED states

---

### HL7 FHIR Standards (USA/International)

DiagnosticReport Status Values:
```
- registered      → Test ordered
- partial         → Preliminary/partial results
- preliminary     → Non-final results
- final           → Final results
- amended         → Results corrected
- corrected       → Correction issued
- cancelled       → Test cancelled
- entered-in-error → Record error
- unknown         → Cannot determine status
```

**Your Implementation:** Only uses basic states, missing FHIR compliance

---

## Detailed Issues & Recommendations

### 🔴 Issue #1: Missing "Sample Received"/QC Status
**Current:** Database has `sample_collected` but dashboard tabs don't show it
```
Problem: Lab technician collects sample → status is 'sample_collected'
         But dashboard has no tab to show samples waiting for processing
         Visibility gap = potential sample loss/forgotten tests
```

**Fix:** Add intermediate statuses between pending and in_progress
```
pending → sample_collected → received_qc → in_progress → completed
```

### 🔴 Issue #2: Missing "Verified" Status
**Current:** Goes directly from `in_progress` → `completed`
```
Problem: No visibility into Results Verification step (required by ISO 15189)
         Lab director must review/approve results before release
         No audit trail of who verified results
```

**Fix:** Add verification step
```
in_progress → results_verified → completed
```

### 🔴 Issue #3: Missing "Reported" Status
**Current:** `completed` means results are done, but doctor hasn't been notified
```
Problem: Can't track if doctor has received/acknowledged results
         ISO 15189 requires proof of result delivery to ordering physician
```

**Fix:** Separate completion from reporting
```
completed → reported → acknowledged
```

### 🟡 Issue #4: Redundant "processing" Status
**Current Database Has:** Both `'processing'` and `'in_progress'`
```
Problem: No clear distinction between them
         Code uses 'in_progress' but DB allows 'processing'
         Confusing for future developers
```

**Fix:** Remove one, consolidate to single in-progress state

### 🟡 Issue #5: No Quality Control (QC) Status
**Current:** Sample collected → immediately in progress
```
Problem: Missing preliminary QC/sample validation check
         Some samples rejected due to insufficient quantity or hemolysis
         Should be separate status: sample_rejected_at_qc vs. test_rejected_at_analysis
```

**Fix:** Add QC check status
```
sample_collected → qc_passed → in_progress → completed
                 └→ qc_failed → rejected
```

---

## Recommended Workflow Realignment

### Minimal Compliance Version (Current + Critical Additions)
```
pending
  ↓ (sample arrives)
sample_collected
  ↓ (QC check)
qc_passed / qc_failed → rejected
  ↓
in_progress
  ↓ (analysis done)
completed
  ↓ (supervisor review - ISO 15189 requirement)
verified
  ↓ (results sent to doctor)
reported
  ↓
cancelled/cancelled_by_user
```

### Dashboard Recommendation
**Tab names should reflect workflow stages that require action:**

**Current (4 tabs):**
- Pending Tests
- In Progress
- Completed
- Rejected

**Recommended (6 tabs) - Better for multi-user lab:**
- **Pending** - Orders awaiting sample collection
- **Samples Received** - Samples in QC/validation
- **In Progress** - Tests actively being processed
- **Completed** - Testing done, awaiting verification
- **Verified** - Results reviewed, ready to report
- **Rejected/Cancelled** - Invalid samples or cancelled orders

---

## Impact Assessment

### What Works Currently ✅
- Clear pending → processing → completed flow for typical tests
- Rejection capability for failed samples
- Priority filtering (urgent tests section)

### What's Missing ❌
- **Quality Control stage visibility** - Critical for lab safety
- **Results verification audit trail** - Required by ISO 15189
- **Reporting status** - Required by HL7 FHIR
- **Turnaround time tracking** - No visibility into delays
- **Root cause for rejection** - Just "rejected" with no reason

### Compliance Risk 🚨
If your lab is pursuing or has ISO 15189 accreditation:
- **Findings:** Missing documented verification step
- **Severity:** Critical (cannot validate test results are reviewed)
- **Required Fix:** Add verification status and audit trail

If interfacing with EHR systems expecting HL7 FHIR:
- **Issue:** Status mapping mismatch
- **Example:** FHIR expects "final" or "preliminary" but you only have "completed"

---

## Recommended Changes Priority

### Phase 1 (Compliance Critical) - Do First
1. Add "verified" status between "in_progress" and "completed"
2. Add column to track "verified_by" user and timestamp
3. Update dashboard tab from "Completed" → "Needs Verification"
4. Add tab "Verified Results"

### Phase 2 (Best Practice) - After Phase 1
1. Add "sample_received" tab (show sample_collected status)
2. Split rejection into "qc_failed" and "analysis_failed" for audit trail
3. Add "rejection_reason" field to track why sample was rejected
4. Add "reported" status for HL7 FHIR compliance

### Phase 3 (Optimization) - Future
1. Implement TAT (Turnaround Time) alerts
2. Add sample tracking barcode
3. Implement inter-lab communication for reference labs
4. Add batch processing status

---

## Current Database Schema Issues

```sql
-- CURRENT (Problematic)
status TEXT CHECK (status IN ('pending', 'sample_collected', 'processing', 'in_progress', 'completed', 'rejected', 'cancelled'))

-- RECOMMENDED
status TEXT CHECK (status IN (
  'pending',                    -- Order placed
  'sample_received',            -- Sample arrived at lab
  'in_progress',                -- Testing underway
  'completed',                  -- Testing finished
  'verified',                   -- Results verified by supervisor
  'reported',                   -- Results sent to doctor
  'rejected',                   -- Sample/test failed
  'cancelled'                   -- Order cancelled
))

-- ALSO ADD THESE COLUMNS for audit trail:
verified_by UUID REFERENCES auth.users(id)
verified_at TIMESTAMP WITH TIME ZONE
rejection_reason TEXT  -- Why was it rejected?
reported_to_doctor_at TIMESTAMP WITH TIME ZONE
```

---

## Summary: Does the Current Dashboard Make Sense?

| Aspect | Assessment | Impact |
|--------|-----------|--------|
| **Basic Workflow** | ✅ Good | Clear pending→processing→done flow |
| **ISO 15189 Compliance** | ❌ Critical Gap | Missing verification step |
| **HL7 FHIR Compatibility** | ❌ Not Compatible | Wrong status names |
| **Quality Assurance** | ⚠️ Weak | No QC stage visibility |
| **Audit Trail** | ❌ Missing | Can't track who verified results |
| **User Clarity** | ✅ Good | Tab names are clear |
| **International Standards** | ❌ Non-Compliant | Simplified beyond recommended |

### Final Verdict
**✅ Works for basic clinical testing, but ❌ Not suitable for accredited/regulated labs**

If this is an academic or teaching clinic: Current design is adequate
If pursuing ISO 15189 accreditation: **Must add verification status**
If interfacing with hospital EHR: **Must map to HL7 FHIR standards**
