# Appointment Validation Logic Analysis

## Summary
This document provides a comprehensive analysis of appointment validation logic in the HeritedgeMedicalCentre system. **Currently, there is NO validation for overlapping appointments or duplicate appointments with the same doctor.**

---

## 1. Appointment Data Model / Schema

### File: [src/integrations/supabase/types.ts](src/integrations/supabase/types.ts#L17)

**Appointments Table Structure:**
```typescript
appointments: {
  Row: {
    appointment_date: string
    appointment_time: string
    created_at: string
    department: string | null
    doctor_id: string
    duration_minutes: number
    id: string
    notes: string | null
    patient_id: string
    reason: string | null
    status: string  // CHECK constraint: 'scheduled', 'confirmed', 'waiting', 'in_progress', 'completed', 'cancelled', 'no_show'
    updated_at: string
  }
  Insert: {
    appointment_date: string
    appointment_time: string
    doctor_id: string
    duration_minutes?: number  // Default: (none specified, but used as 30)
    patient_id: string
    reason?: string | null
    status?: string  // Default: (specified in mutations)
    department?: string | null
  }
}
```

**Available Fields:**
- `patient_id` - Foreign key to patients table
- `doctor_id` - Foreign key to profiles/users table
- `appointment_date` - Date in 'yyyy-MM-dd' format
- `appointment_time` - Time in 'HH:mm' format (24-hour)
- `duration_minutes` - Appointment duration (default 30)
- `department` - Department/specialty
- `reason` - Reason for visit
- `status` - Status with CHECK constraint
- `created_at`, `updated_at` - Timestamps

---

## 2. Appointment Creation/Scheduling Mutations

### A. Appointments Page (Patient/Doctor Creation)

**File:** [src/pages/Appointments.tsx](src/pages/Appointments.tsx#L336)
**Lines:** 336-420

**Mutation Function:**
```typescript
const createAppointmentMutation = useMutation({
  mutationFn: async (data: typeof newAppointment) => {
    try {
      // ✅ VALIDATION: Basic field validation
      if (!data.patient_id) {
        throw new Error('Please select a patient.');
      }
      if (!data.doctor_id) {
        throw new Error('Please select a doctor.');
      }
      
      // ❌ NO VALIDATION for:
      // - Overlapping appointments
      // - Duplicate appointments with same doctor
      // - Time conflicts
      
      const insertObj = {
        patient_id: data.patient_id,
        doctor_id: data.doctor_id,
        appointment_date: data.appointment_date,
        appointment_time: data.appointment_time,
        duration_minutes: data.duration_minutes,
        reason: data.reason || null,
        department: data.department || null,
        status: 'scheduled',
      };
      
      const { data: result, error } = await supabase
        .from('appointments')
        .insert(insertObj);
      
      if (error) {
        throw new Error(`Failed to create appointment: ${error.message}`);
      }
      return result;
    } catch (err) {
      console.error('[Appointments] Exception in createAppointmentMutation:', err);
      throw err;
    }
  },
  onSuccess: async (result) => {
    await queryClient.refetchQueries({ queryKey: ['appointments'] });
    setIsAddDialogOpen(false);
    setNewAppointment({...});
    toast.success('Appointment scheduled successfully');
  },
  onError: (error: Error) => {
    toast.error(`Failed to schedule appointment: ${error.message}`);
  },
});
```

**Validation Present:**
- ✅ `patient_id` required
- ✅ `doctor_id` required

**Validation Missing:**
- ❌ No check for overlapping appointments
- ❌ No check for duplicate appointments with same doctor
- ❌ No check for invalid time slots
- ❌ No check for past dates

---

### B. Reception Dashboard (Receptionist Creation)

**File:** [src/pages/ReceptionDashboard.tsx](src/pages/ReceptionDashboard.tsx#L200)
**Lines:** 200-330

**Mutation Function:**
```typescript
const scheduleAppointmentMutation = useMutation({
  mutationFn: async (data: typeof scheduleForm) => {
    if (!userId) {
      throw new Error('Not authenticated. Please log in again.');
    }

    // Get selected patient and doctor for validation
    const selectedPatient = patients.find((p: any) => p.id === data.patient_id);
    const selectedDoctor = doctors.find((d: any) => d.id === data.doctor_id);
    
    // ✅ VALIDATION: Verify doctor exists
    if (!selectedDoctor) {
      throw new Error(`Doctor not found in available doctors list. Doctor ID: ${data.doctor_id}`);
    }
    
    // ✅ VALIDATION: Verify patient exists
    if (!selectedPatient) {
      throw new Error(`Patient not found in available patients list. Patient ID: ${data.patient_id}`);
    }
    
    // ❌ NO VALIDATION for:
    // - Overlapping appointments
    // - Duplicate appointments with same doctor
    // - Time conflicts

    const { error, data: response } = await supabase
      .from('appointments')
      .insert({
        patient_id: data.patient_id,
        doctor_id: data.doctor_id,
        appointment_date: data.appointment_date,
        appointment_time: data.appointment_time,
        reason: data.reason,
        status: 'scheduled',
      });
    
    if (error) {
      console.error('[ReceptionDashboard] Error:', error);
      throw new Error(`Failed to create appointment: ${error.message}`);
    }
    
    return { success: true };
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['reception-today-appointments'] });
    toast.success('Appointment scheduled successfully');
    setIsScheduleDialogOpen(false);
    setScheduleForm({...});
  },
  onError: (error: Error) => {
    toast.error(`Failed to schedule appointment: ${error.message}`);
  },
});
```

**Validation Present:**
- ✅ `patient_id` required (client-side)
- ✅ `doctor_id` required (client-side)
- ✅ Doctor exists in available doctors list
- ✅ Patient exists in available patients list

**Validation Missing:**
- ❌ No check for overlapping appointments
- ❌ No check for duplicate appointments with same doctor
- ❌ No check for invalid time slots
- ❌ No check for past dates

---

### C. Patients Page (Inline Appointment Creation)

**File:** [src/pages/Patients.tsx](src/pages/Patients.tsx#L445)
**Lines:** 445-480

**Mutation Function:**
```typescript
const createAppointmentMutation = useMutation({
  mutationFn: async (appointmentData: typeof appointmentForm) => {
    if (!selectedPatient?.id) throw new Error('Patient not selected');
    if (!appointmentData.doctor_id) throw new Error('Doctor is required');
    if (!appointmentData.appointment_date) throw new Error('Appointment date is required');
    if (!appointmentData.appointment_time) throw new Error('Appointment time is required');

    // ❌ NO VALIDATION for:
    // - Overlapping appointments
    // - Duplicate appointments with same doctor
    // - Time conflicts

    const { error } = await supabase
      .from('appointments')
      .insert({
        patient_id: selectedPatient.id,
        doctor_id: appointmentData.doctor_id,
        appointment_date: appointmentData.appointment_date,
        appointment_time: appointmentData.appointment_time,
        duration_minutes: appointmentData.duration_minutes,
        department: appointmentData.department || null,
        reason: appointmentData.reason || null,
        status: 'scheduled',
      });

    if (error) {
      console.error('[Patients] Appointment creation error:', error);
      throw error;
    }
  },
  onSuccess: () => {
    toast.success('Appointment scheduled successfully');
    setIsScheduleAppointmentDialogOpen(false);
    setAppointmentForm({...});
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
  },
  onError: (error: any) => {
    toast.error(error?.message || 'Failed to schedule appointment');
  },
});
```

**Validation Present:**
- ✅ All required fields present

**Validation Missing:**
- ❌ No check for overlapping appointments
- ❌ No check for duplicate appointments with same doctor
- ❌ No check for invalid time slots
- ❌ No check for past dates

---

## 3. Appointment Scheduling UI Forms

### A. Appointments Page Form

**File:** [src/pages/Appointments.tsx](src/pages/Appointments.tsx#L610)
**Lines:** 560-750

**Form Fields Collected:**
```typescript
// State initialization (line 100+)
const [newAppointment, setNewAppointment] = useState({
  patient_id: '',
  doctor_id: '',
  appointment_date: format(new Date(), 'yyyy-MM-dd'),
  appointment_time: '09:00',
  duration_minutes: 30,
  reason: '',
  department: '',
});

// Form HTML (approx lines 600-740)
<div className="space-y-2">
  <Label>Patient *</Label>
  <Combobox
    options={patientsList?.map((p) => ({
      value: p.id,
      label: `${p.first_name} ${p.last_name} (${p.patient_number})`
    }))}
    value={newAppointment.patient_id}
    onValueChange={(value) => setNewAppointment({...newAppointment, patient_id: value})}
    placeholder="Select patient"
  />
</div>

<div className="space-y-2">
  <Label>Doctor *</Label>
  <Select
    value={newAppointment.doctor_id}
    onValueChange={(value) => setNewAppointment({...newAppointment, doctor_id: value})}
  >
    <SelectContent>
      {doctors?.map((d: any) => (
        <SelectItem key={d.user_id} value={d.user_id}>
          Dr. {d.full_name} {d.department && `(${d.department})`}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

<div className="space-y-2">
  <Label>Date *</Label>
  <Input type="date" value={newAppointment.appointment_date} onChange={(e) => ...} />
</div>

<div className="space-y-2">
  <Label>Time *</Label>
  <Input type="time" value={newAppointment.appointment_time} onChange={(e) => ...} />
</div>

<div className="space-y-2">
  <Label>Duration (minutes)</Label>
  <Select value={newAppointment.duration_minutes.toString()}>
    <SelectItem value="15">15 min</SelectItem>
    <SelectItem value="30">30 min</SelectItem>
    <SelectItem value="45">45 min</SelectItem>
    <SelectItem value="60">1 hour</SelectItem>
  </Select>
</div>

<div className="space-y-2">
  <Label>Department</Label>
  <Input placeholder="Department or specialty" value={newAppointment.department} />
</div>

<div className="space-y-2">
  <Label>Reason for Visit</Label>
  <Textarea placeholder="Brief description" rows={3} />
</div>
```

---

### B. Reception Dashboard Form

**File:** [src/pages/ReceptionDashboard.tsx](src/pages/ReceptionDashboard.tsx#L860)
**Lines:** 800-980

**Form Fields Collected:**
```typescript
// State initialization
const [scheduleForm, setScheduleForm] = useState({
  patient_id: '',
  doctor_id: '',
  appointment_date: '',
  appointment_time: '',
  reason: '',
});

// Form HTML
<div className="space-y-2">
  <Label>Patient *</Label>
  <Combobox
    options={patients.map((p: any) => ({
      value: p.id,
      label: `${p.first_name} ${p.last_name}${p.patient_number ? ` (${p.patient_number})` : ''}${p.phone ? ` - ${p.phone}` : ''}`
    }))}
    value={scheduleForm.patient_id}
    onValueChange={(v) => setScheduleForm({...scheduleForm, patient_id: v})}
    placeholder="Select patient"
  />
</div>

<div className="space-y-2">
  <Label>Doctor *</Label>
  <Select
    value={scheduleForm.doctor_id}
    onValueChange={(v) => setScheduleForm({...scheduleForm, doctor_id: v})}
  >
    <SelectContent>
      {doctors.map((d: any) => (
        <SelectItem key={d.id} value={d.id}>
          {d.full_name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

<div className="grid grid-cols-2 gap-4">
  <div className="space-y-2">
    <Label>Date *</Label>
    <Input
      type="date"
      value={scheduleForm.appointment_date}
      onChange={(e) => setScheduleForm({...scheduleForm, appointment_date: e.target.value})}
    />
  </div>
  <div className="space-y-2">
    <Label>Time *</Label>
    <Input
      type="time"
      value={scheduleForm.appointment_time}
      onChange={(e) => setScheduleForm({...scheduleForm, appointment_time: e.target.value})}
    />
  </div>
</div>

<div className="space-y-2">
  <Label>Reason for Visit</Label>
  <Input
    placeholder="Reason"
    value={scheduleForm.reason}
    onChange={(e) => setScheduleForm({...scheduleForm, reason: e.target.value})}
  />
</div>
```

---

### C. Patients Page Form

**File:** [src/pages/Patients.tsx](src/pages/Patients.tsx#L1280)
**Lines:** 1270-1410

**Form Fields Collected:**
```typescript
// State initialization
const [appointmentForm, setAppointmentForm] = useState({
  doctor_id: '',
  appointment_date: '',
  appointment_time: '',
  duration_minutes: 30,
  department: '',
  reason: '',
});

// Form HTML
<div className="relative z-50">
  <Label htmlFor="doctor">Doctor *</Label>
  <Combobox
    options={doctors?.map((doctor: any) => ({
      value: doctor.id,
      label: `Dr. ${doctor.first_name} ${doctor.last_name}`
    }))}
    value={appointmentForm.doctor_id}
    onValueChange={(value) => setAppointmentForm({...appointmentForm, doctor_id: value})}
    placeholder="Select doctor"
  />
</div>

<div className="space-y-2">
  <Label>Date *</Label>
  <Input
    type="date"
    value={appointmentForm.appointment_date}
    onChange={(e) => setAppointmentForm({...appointmentForm, appointment_date: e.target.value})}
  />
</div>

<div className="space-y-2">
  <Label>Time *</Label>
  <Input
    type="time"
    value={appointmentForm.appointment_time}
    onChange={(e) => setAppointmentForm({...appointmentForm, appointment_time: e.target.value})}
  />
</div>

<div className="space-y-2">
  <Label>Duration</Label>
  <Select value={appointmentForm.duration_minutes.toString()}>
    <!-- Options: 15, 30, 45, 60 minutes -->
  </Select>
</div>

<div className="space-y-2">
  <Label>Department</Label>
  <Input placeholder="e.g. Cardiology, Pediatrics" value={appointmentForm.department} />
</div>

<div className="space-y-2">
  <Label>Reason for Visit</Label>
  <Input placeholder="Brief description" value={appointmentForm.reason} />
</div>
```

---

## 4. Database Validation & Constraints

### A. Doctor Validation Trigger

**File:** [supabase/migrations/20260201_validate_appointment_doctor.sql](supabase/migrations/20260201_validate_appointment_doctor.sql)
**Lines:** 1-20

**Validation Function:**
```sql
-- Add a function to validate doctor exists and has doctor role
CREATE OR REPLACE FUNCTION public.validate_doctor_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if doctor_id references a valid user with doctor role
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = NEW.doctor_id AND role = 'doctor'
  ) THEN
    RAISE EXCEPTION 'Invalid doctor_id: User must have doctor role';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate doctor role on insert/update
DROP TRIGGER IF EXISTS validate_appointment_doctor ON public.appointments;
CREATE TRIGGER validate_appointment_doctor
BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.validate_doctor_role();
```

**Validation Present:**
- ✅ Doctor must exist with 'doctor' role
- ✅ Trigger runs on INSERT and UPDATE

**Validation Missing:**
- ❌ No check for overlapping time slots
- ❌ No check for duplicate appointments with same doctor

---

### B. Status CHECK Constraint

**File:** [supabase/migrations/20260217_comprehensive_appointments_fix.sql](supabase/migrations/20260217_comprehensive_appointments_fix.sql)
**Lines:** 23+

**Constraint:**
```sql
ALTER TABLE public.appointments
ADD CONSTRAINT appointments_status_check 
CHECK (status IN ('scheduled', 'confirmed', 'waiting', 'in_progress', 'completed', 'cancelled', 'no_show'));
```

---

### C. RLS Policies

**File:** [supabase/migrations/20260209_comprehensive_appointments_rls_fix.sql](supabase/migrations/20260209_comprehensive_appointments_rls_fix.sql)
**Lines:** 1-57

**Policies:**
```sql
-- Everyone can SELECT (view) all appointments
CREATE POLICY "All staff can view appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (true);

-- Everyone can INSERT (create) new appointments
CREATE POLICY "All staff can create appointments"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Everyone can UPDATE appointments
CREATE POLICY "All staff can update appointments"
ON public.appointments
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Only admins and receptionists can DELETE appointments
CREATE POLICY "Admins and receptionists can delete appointments"
ON public.appointments
FOR DELETE
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'receptionist')
);
```

**Note:** RLS policies do NOT validate for overlapping appointments.

---

## 5. Reschedule Appointment Mutations

### A. Reception Dashboard Reschedule

**File:** [src/pages/ReceptionDashboard.tsx](src/pages/ReceptionDashboard.tsx#L317)
**Lines:** 317-360

```typescript
const rescheduleAppointmentMutation = useMutation({
  mutationFn: async (data: { appointment_id: string; appointment_date: string; appointment_time: string }) => {
    if (!userId) {
      throw new Error('Not authenticated. Please log in again.');
    }

    const { appointment_id, ...updateData } = data;
    const { error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', appointment_id);
    if (error) throw error;
    return { success: true };
  },
  // Success/error handlers...
});
```

**Validation Missing:**
- ❌ No check for overlapping appointments when rescheduling
- ❌ No check for duplicate appointments with same doctor

---

### B. Doctor Dashboard Reschedule

**File:** [src/pages/DoctorDashboard.tsx](src/pages/DoctorDashboard.tsx#L729)
**Lines:** 729-800

```typescript
const rescheduleAppointmentMutation = useMutation({
  mutationFn: async (data: { appointment_id: string; appointment_date: string; appointment_time: string }) => {
    // Similar validation as ReceptionDashboard
    // ❌ No check for overlapping appointments
    // ❌ No check for duplicate appointments with same doctor
  },
  // ...
});
```

---

## 6. Summary of Validation Gaps

### Current Validations ✅
1. **Patient required** - Must select a patient (all pages)
2. **Doctor required** - Must select a doctor (all pages)
3. **Doctor exists** - Doctor exists in available list (ReceptionDashboard only)
4. **Patient exists** - Patient exists in available list (ReceptionDashboard only)
5. **Doctor role valid** - Database trigger checks doctor has 'doctor' role
6. **Status valid** - Database CHECK constraint validates status values

### Missing Validations ❌
1. **Overlapping appointments** - No check if doctor has appointment at same time
2. **Duplicate appointments** - No check if same doctor-patient combo already scheduled
3. **Time conflicts** - No validation for time slot availability
4. **Past dates** - No validation preventing appointments in the past
5. **Business hours** - No validation for appointment times within business hours
6. **Double-booking** - Doctor could be booked for multiple overlapping appointments

### Data Fields Available for Validation
- `appointment_date` - YYYY-MM-DD format
- `appointment_time` - HH:mm format (24-hour)
- `duration_minutes` - Appointment duration (allows calculation of end time)
- `doctor_id` - Identify doctor for overlap checks
- `patient_id` - Identify patient for duplicate checks

---

## Recommendations for Validation Implementation

### Option 1: Client-Side Validation (React Mutation)
Add validation in the mutation `mutationFn` before calling Supabase:
```typescript
// Before insert, query for conflicts:
const { data: conflictingAppointments } = await supabase
  .from('appointments')
  .select('*')
  .eq('doctor_id', data.doctor_id)
  .eq('appointment_date', data.appointment_date)
  .in('status', ['scheduled', 'confirmed', 'in_progress'])
  // Check time overlap logic
  
if (conflictingAppointments?.length > 0) {
  throw new Error('Doctor has conflicting appointment at this time');
}
```

### Option 2: Database-Level Validation (PostgreSQL Function/Trigger)
Create a PostgreSQL function that:
1. Checks for overlapping appointments
2. Validates no duplicate doctor-patient combinations
3. Prevents past dates

### Option 3: RPC Function (Hybrid Approach)
Create a Supabase RPC function that combines both validations.

---

## Files to Modify for Overlap Validation

1. **[src/pages/Appointments.tsx](src/pages/Appointments.tsx#L336)** - Line 336+
2. **[src/pages/ReceptionDashboard.tsx](src/pages/ReceptionDashboard.tsx#L200)** - Line 200+
3. **[src/pages/Patients.tsx](src/pages/Patients.tsx#L445)** - Line 445+
4. Create new validation function or PostgreSQL trigger

