import { supabase } from '@/integrations/supabase/client';

interface NotificationData {
  user_id: string;
  title: string;
  message: string;
  type: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_read: boolean;
  reference_id: string | null;
  reference_type: string | null;
  read_at: string | null;
}

// Role-specific notification generators
export const generateDoctorNotifications = (): Omit<NotificationData, 'user_id'>[] => {
  return [
    {
      title: 'New Appointment Scheduled',
      message: 'Patient John Doe scheduled for consultation on March 26, 2:00 PM',
      type: 'appointment_scheduled',
      priority: 'high',
      is_read: false,
      reference_id: null,
      reference_type: 'appointment',
      read_at: null,
    },
    {
      title: 'Appointment Reminder',
      message: 'You have an appointment with Sarah Smith in 1 hour',
      type: 'appointment_reminder',
      priority: 'normal',
      is_read: false,
      reference_id: null,
      reference_type: 'appointment',
      read_at: null,
    },
    {
      title: 'Patient Check-in',
      message: 'Patient James Wilson has checked in for their appointment',
      type: 'patient_check_in',
      priority: 'high',
      is_read: false,
      reference_id: null,
      reference_type: 'appointment',
      read_at: null,
    },
    {
      title: 'Examination Results Ready',
      message: 'Lab results for patient Emma Davis are ready for review',
      type: 'examination_result_ready',
      priority: 'high',
      is_read: true,
      reference_id: null,
      reference_type: 'lab_order',
      read_at: new Date(Date.now() - 3600000).toISOString(),
    },
  ];
};

export const generateLabNotifications = (): Omit<NotificationData, 'user_id'>[] => {
  return [
    {
      title: 'New Lab Order',
      message: 'Lab order LO-2026-001 received for patient Michael Brown - Blood Test',
      type: 'lab_order_created',
      priority: 'high',
      is_read: false,
      reference_id: null,
      reference_type: 'lab_order',
      read_at: null,
    },
    {
      title: 'Lab Results Ready',
      message: 'Lab results for patient Patricia Johnson are ready to be released',
      type: 'lab_results_ready',
      priority: 'high',
      is_read: false,
      reference_id: null,
      reference_type: 'lab_order',
      read_at: null,
    },
    {
      title: 'Abnormal Lab Result',
      message: 'Abnormal glucose levels detected in patient Robert Wilson\'s test results',
      type: 'lab_results_abnormal',
      priority: 'urgent',
      is_read: false,
      reference_id: null,
      reference_type: 'lab_order',
      read_at: null,
    },
    {
      title: 'Sample Rejected',
      message: 'Blood sample for patient Lisa Anderson was rejected - please recollect',
      type: 'lab_sample_rejected',
      priority: 'high',
      is_read: true,
      reference_id: null,
      reference_type: 'lab_order',
      read_at: new Date(Date.now() - 7200000).toISOString(),
    },
  ];
};

export const generateReceptionNotifications = (): Omit<NotificationData, 'user_id'>[] => {
  return [
    {
      title: 'New Appointment',
      message: 'Patient David Miller booked appointment with Dr. Smith for March 27, 10:00 AM',
      type: 'appointment_scheduled',
      priority: 'normal',
      is_read: false,
      reference_id: null,
      reference_type: 'appointment',
      read_at: null,
    },
    {
      title: 'Patient Check-in',
      message: 'Patient Susan Taylor has checked in at reception',
      type: 'patient_check_in',
      priority: 'high',
      is_read: false,
      reference_id: null,
      reference_type: 'appointment',
      read_at: null,
    },
    {
      title: 'Follow-up Needed',
      message: 'Patient Kevin Davis requires follow-up appointment scheduling',
      type: 'patient_follow_up_needed',
      priority: 'normal',
      is_read: false,
      reference_id: null,
      reference_type: 'appointment',
      read_at: null,
    },
    {
      title: 'Appointment Cancelled',
      message: 'Patient Margaret Lee cancelled appointment scheduled for March 28',
      type: 'appointment_cancelled',
      priority: 'normal',
      is_read: true,
      reference_id: null,
      reference_type: 'appointment',
      read_at: new Date(Date.now() - 10800000).toISOString(),
    },
  ];
};

export const generateNurseNotifications = (): Omit<NotificationData, 'user_id'>[] => {
  return [
    {
      title: 'New Patient Assignment',
      message: 'You have been assigned to care for patient Jennifer White in Ward A',
      type: 'patient_check_in',
      priority: 'high',
      is_read: false,
      reference_id: null,
      reference_type: 'appointment',
      read_at: null,
    },
    {
      title: 'Medication Due',
      message: 'Patient Christopher Harris is due for medication at 2:30 PM',
      type: 'prescription_dispensed',
      priority: 'high',
      is_read: false,
      reference_id: null,
      reference_type: 'prescription',
      read_at: null,
    },
    {
      title: 'Patient Vitals Alert',
      message: 'Patient Nancy Rodriguez has elevated blood pressure - please review',
      type: 'patient_follow_up_needed',
      priority: 'urgent',
      is_read: false,
      reference_id: null,
      reference_type: 'appointment',
      read_at: null,
    },
    {
      title: 'Medical Record Updated',
      message: 'Medical record for patient Daniel Martinez has been updated by physician',
      type: 'medical_record_updated',
      priority: 'normal',
      is_read: true,
      reference_id: null,
      reference_type: 'appointment',
      read_at: new Date(Date.now() - 14400000).toISOString(),
    },
  ];
};

export const generatePharmacistNotifications = (): Omit<NotificationData, 'user_id'>[] => {
  return [
    {
      title: 'New Prescription',
      message: 'Prescription PR-2026-145 from Dr. Smith for Amoxicillin is pending dispensing',
      type: 'prescription_submitted',
      priority: 'high',
      is_read: false,
      reference_id: null,
      reference_type: 'prescription',
      read_at: null,
    },
    {
      title: 'Low Stock Alert',
      message: 'Paracetamol stock is running low (45 units remaining)',
      type: 'low_stock_alert',
      priority: 'high',
      is_read: false,
      reference_id: null,
      reference_type: null,
      read_at: null,
    },
    {
      title: 'Inventory Critical',
      message: 'Insulin supply is critically low - immediate reorder required',
      type: 'inventory_critical',
      priority: 'urgent',
      is_read: false,
      reference_id: null,
      reference_type: null,
      read_at: null,
    },
    {
      title: 'Prescription Ready',
      message: 'Prescription for patient Steven Garcia is ready for pickup',
      type: 'prescription_ready',
      priority: 'normal',
      is_read: true,
      reference_id: null,
      reference_type: 'prescription',
      read_at: new Date(Date.now() - 5400000).toISOString(),
    },
  ];
};

// Create sample notifications for a user
export const createSampleNotificationsForUser = async (
  userId: string,
  role: string
): Promise<boolean> => {
  try {
    let notificationsList: Omit<NotificationData, 'user_id'>[] = [];

    switch (role) {
      case 'doctor':
        notificationsList = generateDoctorNotifications();
        break;
      case 'lab_technician':
        notificationsList = generateLabNotifications();
        break;
      case 'receptionist':
        notificationsList = generateReceptionNotifications();
        break;
      case 'nurse':
        notificationsList = generateNurseNotifications();
        break;
      case 'pharmacist':
        notificationsList = generatePharmacistNotifications();
        break;
      default:
        return false;
    }

    // Add user_id to each notification
    const notificationsToInsert = notificationsList.map(n => ({
      user_id: userId,
      title: n.title,
      message: n.message,
      type: n.type as string,
      priority: n.priority,
      is_read: n.is_read,
      reference_id: n.reference_id,
      reference_type: n.reference_type,
      read_at: n.read_at,
    })) as NotificationData[];

    const { error } = await supabase
      .from('notifications')
      .insert(notificationsToInsert);

    if (error) {
      console.error('Error creating sample notifications:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in createSampleNotificationsForUser:', error);
    return false;
  }
};
