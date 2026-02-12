# Nursing Task & Patient Assignment Implementation Guide

## Overview

This implementation adds comprehensive task assignment and patient assignment workflows to the nursing module, enabling Charge Nurses, Senior Nurses, and Doctors to manage nursing operations efficiently.

## What Was Implemented

### 1. Database Tables & Schema

**Location:** `/supabase/migrations/20260212_create_nursing_task_assignment_tables.sql`

Two new tables were created:

#### `nursing_tasks` Table
```sql
- id: UUID (Primary Key)
- patient_id: UUID (Foreign Key → patients.id)
- assigned_nurse_id: UUID (Foreign Key → auth.users.id)
- assigned_by_id: UUID (Foreign Key → auth.users.id)
- title: VARCHAR(255)
- description: TEXT (optional)
- priority: VARCHAR(50) - low | normal | high | critical
- status: VARCHAR(50) - pending | acknowledged | in_progress | completed | cancelled
- due_time: TIMESTAMP (optional)
- completed_at: TIMESTAMP (optional)
- completed_notes: TEXT (optional)
- created_at, updated_at: TIMESTAMP
```

#### `patient_assignments` Table
```sql
- id: UUID (Primary Key)
- patient_id: UUID (Foreign Key → patients.id)
- nurse_id: UUID (Foreign Key → auth.users.id)
- assigned_by_id: UUID (Foreign Key → auth.users.id)
- shift_date: DATE
- priority: VARCHAR(50) - low | normal | high | critical
- is_primary_nurse: BOOLEAN
- reassigned_from_id: UUID (optional, tracks reassignments)
- reassignment_reason: VARCHAR(255) (optional)
- created_at, updated_at: TIMESTAMP
- UNIQUE constraint: (patient_id, nurse_id, shift_date)
```

#### RLS Policies
- Admins: Full access (CRUD all)
- Charge Nurses: Full access (create/manage assignments)
- Doctors: Create/view/edit (limited delete)
- Nurses: View their assigned tasks/patients, update status
- Other roles: No access

### 2. TypeScript Types

**Location:** `/src/types/nursing.ts`

Defines all TypeScript interfaces:
- `NursingTask` - Task model with joined patient/nurse/assigner info
- `PatientAssignment` - Assignment model with joined patient/nurse info
- `TaskPriority` - Task priority enum
- `TaskStatus` - Task status enum
- Form data types for creating/updating tasks and assignments

### 3. React Query Hooks

**Location:** `/src/hooks/useNursingAssignments.ts`

Custom hooks for data fetching and mutations:

#### Queries
- `useNursingTasks(filters?)` - Fetch all nursing tasks with optional filtering
- `useNursingTasksForNurse(nurse_id)` - Fetch tasks for a specific nurse
- `usePatientAssignments(filters?)` - Fetch all patient assignments
- `usePatientAssignmentsForToday(nurse_id)` - Fetch today's assignments for a nurse

#### Mutations
- `useCreateTask()` - Create a new task (requires task_assignment.can_create permission)
- `useUpdateTask()` - Update task status/notes (nurses can only update their own)
- `useDeleteTask()` - Remove task (only creator/admin)
- `useAssignPatient()` - Create patient assignment
- `useReassignPatient()` - Reassign patient to different nurse
- `useDeletePatientAssignment()` - Remove assignment

All hooks include automatic query cache invalidation and error handling with toast notifications.

### 4. UI Components

#### AssignTaskModal
**Location:** `/src/components/nursing/AssignTaskModal.tsx`

- Dialog for creating/assigning new tasks
- Fields: Patient selection, Nurse selection, Task title, Description, Priority, Due time
- Auto-fills current date/time for due_time
- Form validation before submission
- Success toast and automatic parent refresh

#### AssignPatientModal
**Location:** `/src/components/nursing/AssignPatientModal.tsx`

- Dialog for assigning patients to nurses per shift
- Fields: Patient selection, Nurse selection, Priority, Primary nurse checkbox, Shift date
- Defaults to today's date
- Primary nurse designation for load balancing
- Form validation and success feedback

### 5. Permission Model

**Location:** `/supabase/migrations/20260212_add_task_patient_assignment_permissions.sql`

New permission modules added to `role_permissions` table:

#### `task_assignment` Module
| Role | View | Create | Edit | Delete |
|------|------|--------|------|--------|
| admin | ✓ | ✓ | ✓ | ✓ |
| charge_nurse | ✓ | ✓ | ✓ | ✓ |
| doctor | ✓ | ✓ | ✓ | ✗ |
| senior_nurse | ✓ | ✓ | ✓ | ✗ |
| nurse | ✓ | ✗ | ✓ | ✗ |
| receptionist | ✗ | ✗ | ✗ | ✗ |
| lab_technician | ✗ | ✗ | ✗ | ✗ |
| pharmacist | ✗ | ✗ | ✗ | ✗ |

#### `patient_assignment` Module
| Role | View | Create | Edit | Delete |
|------|------|--------|------|--------|
| admin | ✓ | ✓ | ✓ | ✓ |
| charge_nurse | ✓ | ✓ | ✓ | ✓ |
| doctor | ✓ | ✓ | ✓ | ✗ |
| senior_nurse | ✓ | ✗ | ✗ | ✗ |
| nurse | ✓ | ✗ | ✗ | ✗ |
| receptionist | ✗ | ✗ | ✗ | ✗ |
| lab_technician | ✗ | ✗ | ✗ | ✗ |
| pharmacist | ✗ | ✗ | ✗ | ✗ |

Permissions are enforced via RLS policies in database and PermissionGuard component on frontend.

### 6. Updated NursingDashboard

**Location:** `/src/pages/NursingDashboard.tsx`

Integration updates:
- Added new modal states for task/patient assignment
- Replaced mock `useNursingTasks()` with real `useNursingTasksForNurse(user?.id)`
- Replaced mock `useAssignedPatients()` with real `usePatientAssignmentsForToday(user?.id)`
- Added "Assign Task" button to Nursing Tasks section header
- Added "Assign Patient" button to Assigned Patients section header
- New assignment modals wired with refetch callbacks for real-time updates
- Buttons only show if user has appropriate permissions

## Authority Structure

### Task Assignment Authority Hierarchy

**Level 1: Charge Nurse/Nursing Supervisor** 
- Full authority to assign all nursing tasks to team members
- Can reassign tasks if needed
- Orchestrates shift planning and load balancing
- Example: "Sarah, please record vitals on Room 103 STAT"

**Level 2: Senior Nurse/Primary Patient Nurse**
- Can assign tasks only for their own assigned patients
- Coordinates care with team members
- Example: To nursing assistant - "Can you check Room 101 vitals?"

**Level 3: Doctor/Physician**
- Orders specific medical tasks (interventions)
- Specifies frequency and parameters
- Example: "Check vitals every 2 hours" or "Administer Morphine IV Q6H"

**Level 4: Individual Nurse**
- Executes assigned tasks
- Can view and update their assigned task status
- Cannot create or assign new tasks

### Patient Assignment Authority Hierarchy

**Primary: Charge Nurse**
- Assigns patient groups to nurses at shift start
- Load balancing across team
- Can reassign patients mid-shift if acuity changes
- Can update priority levels

**Secondary: Doctor**
- Selects initial nurse during consultation
- Can order specific patient assignments
- Charge Nurse formalizes the assignment

**View Only: Senior Nurse & Nurse**
- Can view their assigned patients
- Cannot reassign or change assignments
- Contact Charge Nurse for reassignment requests

## Data Flow

### Task Assignment Flow
```
1. Charge Nurse opens AssignTaskModal
2. Selects patient, nurse, task title, priority, due time
3. System creates nursing_task record with:
   - assigned_nurse_id = selected nurse
   - assigned_by_id = current user (Charge Nurse)
   - status = 'pending'
4. Assigned nurse sees task in their NursingDashboard
5. Nurse updates task status as they complete it
6. Task marked 'completed' with notes
7. Audit trail maintained via created_at and completed_at timestamps
```

### Patient Assignment Flow
```
1. Doctor/Charge Nurse opens AssignPatientModal
2. Selects patient, nurse, priority, confirms primary nurse status
3. System creates patient_assignment record with:
   - nurse_id = selected nurse
   - assigned_by_id = current user
   - shift_date = today (default, customizable)
   - is_primary_nurse = true/false
4. Nurse sees patient in their Assigned Patients section
5. Charge Nurse can reassign patient:
   - Creates new assignment for new nurse
   - Marks old assignment with reassignment_reason
   - audit trail maintained
6. System enforces unique constraint (patient_id, nurse_id, shift_date)
```

## Workflow Scenarios

### Scenario 1: Morning Shift Briefing (7:00 AM)

```
1. Charge Nurse arrives, reviews patient census
2. Uses AssignPatientModal to:
   - Assign high-acuity patients to experienced nurses
   - Distribute patient load evenly
   - Mark primary nurses for each patient
3. System shows assignments in all nurses' dashboards
4. Doctors review patient assignments during rounds
5. Can order specific interventions via task assignments
```

### Scenario 2: Emergency Reassignment (10:30 AM)

```
1. Patient in Room 105 deteriorates
2. Charge Nurse uses AssignPatientModal → Reassign
3. Selects new nurse, adds reason: "Patient deterioration - needs experienced RN"
4. System:
   - Creates new assignment for new nurse
   - Marks old assignment as "reassigned"
   - Stores reason in reassignment_reason field
5. Both nurses notified of change
6. Old nurse stops primary care, assists transition
7. New nurse becomes primary
```

### Scenario 3: Stat Order (Any Time)

```
1. Doctor orders: "Draw blood cultures STAT - Room 102"
2. System creates nursing task with:
   - priority = 'critical'
   - due_time = current time
   - assigned_nurse = primary nurse for that patient
3. Alert notification sent to nurse's dashboard
4. Nurse marks task complete with notes about procedure
5. Doctor sees completion time and can order next intervention
```

### Scenario 4: Routine Medication Round (2:00 PM)

```
1. Medication administration order automatically creates task
   OR Charge Nurse creates task manually:
   - Title: "Administer Morphine - Room 101"
   - Priority: normal (or high for pain)
   - Due time: 2:00 PM
2. Assigned nurse:
   - Sees task in their list
   - Performs "5 Rights" check (patient, drug, dose, route, time)
   - Uses AdministerMedicationModal to document
   - Marks task complete
3. Audit trail shows:
   - Who administered when
   - Any adverse reactions
   - Provider signature via system user
```

## Integration Points

### With Existing Features
- **NursingDashboard:** Primary UI for nurses to see their tasks and patients
- **StaffSchedule:** Shows shift assignments; tasks respect staff availability
- **PermissionGuard:** Restricts UI based on role_permissions
- **Vitals Recording:** Existing vitals capture, linked to patient
- **Medication Administration:** Existing med admin, can auto-create task
- **Appointments:** Nursing tasks can be created from appointment context

### Real-Time Updates
- React Query automatic refetch after mutations
- WebSocket integration ready (future enhancement)
- Toast notifications for task assignments

## Testing the Implementation

### Prerequisites
1. Ensure migrations have run on Supabase
2. User must have appropriate role (charge_nurse, doctor, etc.)
3. At least one patient and one nurse in system

### Test Cases

**Test 1: Charge Nurse Creates Task**
```
1. Login as charge_nurse user
2. Navigate to NursingDashboard
3. Click "Assign Task" button
4. Fill form: Select patient, nurse, task "Record vitals", priority "normal"
5. Submit
6. Verify: Task appears in assigned nurse's task list
7. Verify: Creator can be seen in task details
```

**Test 2: Nurse Completes Task**
```
1. Login as nurse user
2. In NursingDashboard, find task assigned to them
3. Click task, update status to "in_progress" then "completed"
4. Add notes: "Vitals recorded and normal, next check 6 PM"
5. Submit
6. Verify: Task appears completed with timestamp
7. Verify: Original assigner can see completion details
```

**Test 3: Doctor Assigns Patient**
```
1. Login as doctor user
2. Open AssignPatientModal
3. Select patient from consultation, assign to primary nurse
4. Mark as "primary_nurse = true"
5. Submit
6. Verify: Appears in nurse's patient list for today
7. Verify: Shows as primary assignment
```

**Test 4: Charge Nurse Reassigns Patient**
```
1. Login as charge_nurse
2. Open patient's assignment
3. Click "Reassign" → Select new nurse
4. Add reason: "Shift change - continuity"
5. Submit
6. Verify: New nurse becomes primary
7. Verify: Old assignment marked "reassigned" in audit log
```

## Performance Considerations

### Query Optimization
- Indexes created on: patient_id, assigned_nurse_id, status, due_time, shift_date
- Unique constraint prevents duplicate assignments for same patient/nurse/shift
- Foreign keys ensure referential integrity

### Caching Strategy
- React Query caches: 5 minutes default stale time
- Auto-refetch after mutations
- Can be tuned per hook for real-time vs. performance tradeoff

### RLS Performance
- Policies check user_roles for every query
- user_id = auth.uid() checked efficiently at row level
- Consider caching role check if performance becomes issue

## Security

### Row-Level Security (RLS)
- All tables have RLS enabled
- Every query verified against user's role
- Cannot see/modify data you don't have permission for
- Even if SQL query is compromised

### Permission Check Points
- Database: RLS policies on nursing_tasks & patient_assignments
- Frontend: PermissionGuard component hides UI for unauthorized users
- API: useAuth() hook prevents unauthorized mutations
- Audit: created_at, updated_at, assigned_by_id track changes

### Audit Trail
- Every task shows: who created, when created, who assigned to, who completed
- Every assignment shows: who created, when, reassignment history
- Completed tasks preserve notes and completion timestamp
- Reassignments tracked with reason in database

## Future Enhancements

### Phase 2 (Future)
- Task notifications (real-time via WebSocket)
- Task dependencies (e.g., "vitals must be done before medication")
- Recurring tasks (auto-create daily medication tasks)
- Task templates (common task sets for specific diagnoses)
- Task completion predictions (AI-based time estimates)
- Workload analytics (task distribution metrics)

### Phase 3 (Future)
- Mobile app for on-floor task management
- Voice task acknowledgment
- Integration with bed status system
- Predictive patient deterioration alerts
- Machine learning task prioritization

## Migration Notes

When deploying to production:

1. Run migrations in this order:
   - `20260212_create_nursing_task_assignment_tables.sql` (creates tables/RLS)
   - `20260212_add_task_patient_assignment_permissions.sql` (adds permissions)

2. Backup existing data before migration

3. No data loss - purely additive tables

4. RLS is enabled by default and enforced

5. Seed roles first:
   ```sql
   INSERT INTO user_roles (user_id, role) 
   VALUES ('user_uuid', 'charge_nurse');
   ```

6. Grant users appropriate roles before they can see assignment UI

## References

- Nursing Workflow Documentation: `NURSING_WORKFLOW_STANDARD.md`
- Role Permissions Setup: `FIX_ROLE_PERMISSIONS_TABLE.sql`
- Patient Schedule: `StaffSchedule.tsx` (shift assignments)
- Staff Directory: `Staff.tsx` (employee lookup)
