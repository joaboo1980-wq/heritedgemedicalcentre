// Nursing Task Types
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';
export type TaskStatus = 'pending' | 'acknowledged' | 'in_progress' | 'completed' | 'cancelled';

export interface NursingTask {
  id: string;
  patient_id: string;
  assigned_nurse_id: string;
  assigned_by_id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_time?: string;
  completed_at?: string;
  completed_notes?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  patient?: {
    id: string;
    full_name: string;
    mrn?: string;
  };
  assigned_nurse?: {
    id: string;
    full_name: string;
    email: string;
  };
  assigned_by?: {
    id: string;
    full_name: string;
    email: string;
  };
}

// Patient Assignment Types
export type AssignmentPriority = 'low' | 'normal' | 'high' | 'critical';

export interface PatientAssignment {
  id: string;
  patient_id: string;
  nurse_id: string;
  assigned_by_id: string;
  shift_date: string;
  priority: AssignmentPriority;
  is_primary_nurse: boolean;
  reassigned_from_id?: string;
  reassignment_reason?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  patient?: {
    id: string;
    full_name: string;
    mrn?: string;
    room_number?: string;
  };
  nurse?: {
    id: string;
    full_name: string;
    email: string;
  };
  assigned_by?: {
    id: string;
    full_name: string;
    email: string;
  };
  reassigned_from?: {
    id: string;
    full_name: string;
  };
}

// Forms
export interface CreateTaskFormData {
  patient_id: string;
  assigned_nurse_id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  due_time?: string;
}

export interface UpdateTaskFormData {
  status?: TaskStatus;
  completed_notes?: string;
  priority?: TaskPriority;
  due_time?: string;
}

export interface AssignPatientFormData {
  patient_id: string;
  nurse_id: string;
  shift_date: string;
  priority: AssignmentPriority;
  is_primary_nurse: boolean;
}

export interface ReassignPatientFormData {
  new_nurse_id: string;
  reassignment_reason: string;
}
