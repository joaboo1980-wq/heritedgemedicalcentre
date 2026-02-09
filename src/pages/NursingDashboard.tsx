import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDashboardStats } from '@/hooks/useDashboard';
import { useQuery } from '@tanstack/react-query';
import { format, startOfDay, endOfDay } from 'date-fns';
import { AlertCircle, CheckCircle, Clock, Eye, Pill, Heart, FileText, X } from 'lucide-react';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface NursingTask {
  id: string;
  title: string;
  patient: string;
  priority: 'High' | 'Medium' | 'Low';
  dueTime: string;
  status: 'Pending' | 'Completed';
}

interface AssignedPatient {
  id: string;
  name: string;
  room: string;
  priority: 'High' | 'Medium' | 'Critical' | 'Low';
}

interface MedicationDue {
  id: string;
  patient: string;
  medication: string;
  dosage: string;
  dueTime: string;
  status: 'Pending' | 'Done';
}

interface CriticalAlert {
  id: string;
  patient: string;
  room: string;
  alert: string;
}

interface VitalRecord {
  id: string;
  dateTime: string;
  bp: string;
  hr: string;
  temp: string;
  recordedBy: string;
}

interface Vitals {
  temperature: string;
  systolic: string;
  diastolic: string;
  heartRate: string;
  oxygenSaturation: string;
  respiratoryRate: string;
}

const useNursingTasks = () => {
  return useQuery({
    queryKey: ['nursing-tasks'],
    queryFn: async () => {
      // Mock data - replace with actual API call
      const tasks: NursingTask[] = [
        {
          id: '1',
          title: 'Wound dressing change',
          patient: 'Emma Thompson',
          priority: 'High',
          dueTime: '2:00 PM',
          status: 'Pending',
        },
        {
          id: '2',
          title: 'Vital signs check',
          patient: 'James Wilson',
          priority: 'Medium',
          dueTime: '2:15 PM',
          status: 'Completed',
        },
        {
          id: '3',
          title: 'Blood glucose monitoring',
          patient: 'Robert Chen',
          priority: 'Medium',
          dueTime: '3:00 PM',
          status: 'Pending',
        },
        {
          id: '4',
          title: 'Cardiac monitoring review',
          patient: 'Maria Garcia',
          priority: 'High',
          dueTime: '3:30 PM',
          status: 'Pending',
        },
      ];
      return tasks;
    },
  });
};

const useAssignedPatients = () => {
  return useQuery({
    queryKey: ['assigned-patients'],
    queryFn: async () => {
      const patients: AssignedPatient[] = [
        { id: '1', name: 'Emma Thompson', room: 'Room 101A', priority: 'High' },
        { id: '2', name: 'James Wilson', room: 'Room 102B', priority: 'Medium' },
        { id: '3', name: 'Maria Garcia', room: 'Room 103A', priority: 'Critical' },
        { id: '4', name: 'Robert Chen', room: 'Room 104B', priority: 'Low' },
      ];
      return patients;
    },
  });
};

const useMedicationsDueList = () => {
  return useQuery({
    queryKey: ['medications-due-list'],
    queryFn: async () => {
      const medications: MedicationDue[] = [
        {
          id: '1',
          patient: 'Emma Thompson',
          medication: 'Morphine - 5mg',
          dosage: '5mg',
          dueTime: '2:00 PM',
          status: 'Pending',
        },
        {
          id: '2',
          patient: 'James Wilson',
          medication: 'Amoxicillin - 500mg',
          dosage: '500mg',
          dueTime: '2:30 PM',
          status: 'Pending',
        },
        {
          id: '3',
          patient: 'Maria Garcia',
          medication: 'Metoprolol - 25mg',
          dosage: '25mg',
          dueTime: '3:00 PM',
          status: 'Done',
        },
      ];
      return medications;
    },
  });
};

const useCriticalAlerts2 = () => {
  return useQuery({
    queryKey: ['critical-alerts'],
    queryFn: async () => {
      const alerts: CriticalAlert[] = [
        {
          id: '1',
          patient: 'Maria Garcia',
          room: 'Room 103A',
          alert: 'Cardiac monitoring',
        },
      ];
      return alerts;
    },
    staleTime: 30000,
  });
};

const usePatientQueue = () => {
  return useQuery({
    queryKey: ['patient-queue'],
    queryFn: async () => {
      try {
        // Example: fetch patients with status 'waiting' and their room assignments
        const { data, error } = await supabase
          .from('patients')
          .select('id, first_name, last_name, medical_notes, patient_number')
          .order('created_at', { ascending: true })
          .limit(10);
        if (error) {
          console.error('[NursingDashboard] Error fetching patient queue:', error);
          throw error;
        }
        // TODO: Add room and status fields if available in schema
        return (data || []).map((p: any, idx: number) => ({
          id: p.id,
          name: `${p.first_name} ${p.last_name}`,
          room: 100 + idx, // Placeholder for room
          status: 'Waiting', // Placeholder for status
          patient_number: p.patient_number,
        }));
      } catch (err) {
        console.error('[NursingDashboard] Patient queue query failed:', err);
        return [];
      }
    },
  });
};

const useMedicationsDue = () => {
  return useQuery({
    queryKey: ['medications-due'],
    queryFn: async () => {
      try {
        const now = new Date();
        const todayStart = startOfDay(now).toISOString();
        const todayEnd = endOfDay(now).toISOString();

        // Fetch prescriptions that are due today and not yet administered
        const { data, error } = await supabase
          .from('prescriptions')
          .select('id')
          .eq('status', 'active')
          .gte('created_at', todayStart)
          .lte('created_at', todayEnd);

        if (error) {
          console.error('[NursingDashboard] Error fetching medications due:', error);
          throw error;
        }
        return data?.length || 0;
      } catch (err) {
        console.error('[NursingDashboard] Medications due query failed:', err);
        return 0;
      }
    },
    staleTime: 60000, // 1 minute
  });
};

const useVitalsRecorded = () => {
  return useQuery({
    queryKey: ['vitals-recorded-today'],
    queryFn: async () => {
      try {
        const now = new Date();
        const todayDate = format(now, 'yyyy-MM-dd');

        // Try to fetch from vitals table if it exists
        const { data, error } = await supabase
          .from('vitals')
          .select('id', { count: 'exact' })
          .eq('recorded_date', todayDate);

        if (error) {
          // Table might not exist or accessible, return 0
          console.warn('[NursingDashboard] Vitals table not accessible:', error.message);
          return 0;
        }
        return data?.length || 0;
      } catch (err) {
        console.error('[NursingDashboard] Vitals recorded query failed:', err);
        return 0;
      }
    },
    staleTime: 60000, // 1 minute
  });
};

const useCriticalAlerts = () => {
  return useQuery({
    queryKey: ['critical-alerts'],
    queryFn: async () => {
      try {
        // Fetch high-priority or critical lab results
        const { data, error } = await supabase
          .from('lab_orders')
          .select('id')
          .eq('status', 'critical');

        if (error) {
          console.error('[NursingDashboard] Error fetching alerts:', error);
          throw error;
        }
        return data?.length || 0;
      } catch (err) {
        console.error('[NursingDashboard] Critical alerts query failed:', err);
        return 0;
      }
    },
    staleTime: 30000, // 30 seconds for alerts
  });
};

// Modal Components

interface VitalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: AssignedPatient | null;
  onSave: (vitals: any) => void;
}

const RecordVitalsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  patient: AssignedPatient | null;
  onRecorded: () => void;
}> = ({ isOpen, onClose, patient, onRecorded }) => {
  const [vitals, setVitals] = useState<Vitals>({
    temperature: '',
    systolic: '',
    diastolic: '',
    heartRate: '',
    oxygenSaturation: '',
    respiratoryRate: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !patient) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate inputs
      if (!vitals.temperature?.trim()) {
        throw new Error('Temperature is required');
      }
      if (!vitals.systolic?.trim() || !vitals.diastolic?.trim()) {
        throw new Error('Blood pressure is required');
      }
      if (!vitals.heartRate?.trim()) {
        throw new Error('Heart rate is required');
      }

      // Insert vitals into Supabase
      const { error: insertError } = await supabase.from('vitals').insert({
        patient_id: patient.id,
        temperature: parseFloat(vitals.temperature),
        blood_pressure_systolic: parseInt(vitals.systolic),
        blood_pressure_diastolic: parseInt(vitals.diastolic),
        heart_rate: parseInt(vitals.heartRate),
        oxygen_saturation: vitals.oxygenSaturation ? parseFloat(vitals.oxygenSaturation) : null,
        respiratory_rate: vitals.respiratoryRate ? parseInt(vitals.respiratoryRate) : null,
        recorded_at: new Date().toISOString(),
      });

      if (insertError) throw insertError;

      console.log('Vitals recorded successfully for patient:', patient.name);
      setVitals({
        temperature: '',
        systolic: '',
        diastolic: '',
        heartRate: '',
        oxygenSaturation: '',
        respiratoryRate: '',
      });
      onRecorded();
      onClose();
    } catch (err: any) {
      console.error('Error recording vitals:', err);
      setError(err.message || 'Failed to record vitals');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-xl font-bold">Record Vitals</h3>
            <p className="text-sm text-gray-600 mt-1">Record vitals for {patient.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Temperature (°C) *
            </label>
            <input
              type="number"
              step="0.1"
              value={vitals.temperature}
              onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
              placeholder="e.g., 37.2"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Blood Pressure *
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="number"
                  value={vitals.systolic}
                  onChange={(e) => setVitals({ ...vitals, systolic: e.target.value })}
                  placeholder="Systolic"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Systolic</p>
              </div>
              <div className="flex items-center text-gray-500 font-bold">/</div>
              <div className="flex-1">
                <input
                  type="number"
                  value={vitals.diastolic}
                  onChange={(e) => setVitals({ ...vitals, diastolic: e.target.value })}
                  placeholder="Diastolic"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Diastolic</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Heart Rate (bpm) *
            </label>
            <input
              type="number"
              value={vitals.heartRate}
              onChange={(e) => setVitals({ ...vitals, heartRate: e.target.value })}
              placeholder="e.g., 72"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Oxygen Saturation (%)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={vitals.oxygenSaturation}
              onChange={(e) => setVitals({ ...vitals, oxygenSaturation: e.target.value })}
              placeholder="e.g., 98.5"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Respiratory Rate (breaths/min)
            </label>
            <input
              type="number"
              value={vitals.respiratoryRate}
              onChange={(e) => setVitals({ ...vitals, respiratoryRate: e.target.value })}
              placeholder="e.g., 16"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-medium disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Vitals'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const VitalsHistoryModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  patient: AssignedPatient | null;
  onRecordNew: () => void;
}> = ({ isOpen, onClose, patient, onRecordNew }) => {
  const [vitalsData, setVitalsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isOpen && patient) {
      fetchVitals();
    }
  }, [isOpen, patient]);

  const fetchVitals = async () => {
    if (!patient) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vitals')
        .select('*')
        .eq('patient_id', patient.id)
        .order('recorded_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setVitalsData(data || []);
    } catch (err) {
      console.error('Error fetching vitals history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (vitalId: string) => {
    if (!window.confirm('Are you sure you want to delete this vital record?')) return;

    try {
      const { error } = await supabase.from('vitals').delete().eq('id', vitalId);
      if (error) throw error;
      setVitalsData(vitalsData.filter((v) => v.id !== vitalId));
    } catch (err) {
      console.error('Error deleting vital record:', err);
    }
  };

  if (!isOpen || !patient) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-xl font-bold">Vitals History</h3>
            <p className="text-sm text-gray-600 mt-1">Vital signs history for {patient.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <button
          onClick={onRecordNew}
          className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-medium"
        >
          + Record New Vitals
        </button>

        {loading ? (
          <div className="text-center py-8">Loading vitals history...</div>
        ) : vitalsData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No vital records found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Date/Time</th>
                  <th className="px-4 py-2 text-left font-semibold">Temp (°C)</th>
                  <th className="px-4 py-2 text-left font-semibold">BP (mmHg)</th>
                  <th className="px-4 py-2 text-left font-semibold">HR (bpm)</th>
                  <th className="px-4 py-2 text-left font-semibold">O₂ Sat (%)</th>
                  <th className="px-4 py-2 text-left font-semibold">RR (/min)</th>
                  <th className="px-4 py-2 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vitalsData.map((vital) => (
                  <tr key={vital.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2">
                      {format(new Date(vital.recorded_at), 'MMM dd, yyyy h:mm a')}
                    </td>
                    <td className="px-4 py-2">{vital.temperature?.toFixed(1) || '-'}</td>
                    <td className="px-4 py-2">
                      {vital.blood_pressure_systolic && vital.blood_pressure_diastolic
                        ? `${vital.blood_pressure_systolic}/${vital.blood_pressure_diastolic}`
                        : '-'}
                    </td>
                    <td className="px-4 py-2">{vital.heart_rate || '-'}</td>
                    <td className="px-4 py-2">{vital.oxygen_saturation?.toFixed(1) || '-'}</td>
                    <td className="px-4 py-2">{vital.respiratory_rate || '-'}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleDelete(vital.id)}
                        className="text-red-500 hover:text-red-700 font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

interface CarePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: AssignedPatient | null;
  onSave: (data: any) => void;
}

const CreateCarePlanModal: React.FC<CarePlanModalProps> = ({ isOpen, onClose, patient, onSave }) => {
  const [formData, setFormData] = useState({
    goals: '',
    interventions: '',
    criteria: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !patient) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.goals?.trim()) {
        throw new Error('Care Goals are required');
      }
      if (!formData.interventions?.trim()) {
        throw new Error('Nursing Interventions are required');
      }

      // Save care plan to Supabase
      const { error: insertError } = await supabase.from('care_plans').insert({
        patient_id: patient.id,
        care_goals: formData.goals,
        nursing_interventions: formData.interventions,
        evaluation_criteria: formData.criteria,
        created_at: new Date().toISOString(),
      });

      if (insertError) throw insertError;

      console.log('Care plan saved for patient:', patient.name);
      setFormData({ goals: '', interventions: '', criteria: '' });
      onSave(formData);
      onClose();
    } catch (err: any) {
      console.error('Error saving care plan:', err);
      setError(err.message || 'Failed to save care plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-lg font-bold text-gray-800">Create Care Plan</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">Create a care plan for {patient.name}</p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Care Goals *
            </label>
            <textarea
              value={formData.goals}
              onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
              placeholder="Define patient care goals..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nursing Interventions *
            </label>
            <textarea
              value={formData.interventions}
              onChange={(e) => setFormData({ ...formData, interventions: e.target.value })}
              placeholder="List nursing interventions..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Evaluation Criteria
            </label>
            <textarea
              value={formData.criteria}
              onChange={(e) => setFormData({ ...formData, criteria: e.target.value })}
              placeholder="How will progress be evaluated..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-medium disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Care Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface MedicationAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicationDue: MedicationDue | null;
  onSave: (data: any) => void;
}

const AdministerMedicationModal: React.FC<MedicationAdminModalProps> = ({
  isOpen,
  onClose,
  medicationDue,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    route: '',
    dosage: '',
    notes: '',
  });

  if (!isOpen || !medicationDue) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setFormData({ route: '', dosage: '', notes: '' });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Administer Medication</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Patient:</span> {medicationDue.patient}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Medication:</span> {medicationDue.medication}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Medication *</label>
            <select
              value={formData.route}
              onChange={(e) => setFormData({ ...formData, route: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select medication</option>
              <option value="med1">{medicationDue.medication}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Dosage *</label>
            <input
              type="text"
              value={formData.dosage}
              onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
              placeholder={medicationDue.dosage}
              defaultValue={medicationDue.dosage}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Route *</label>
            <select
              value={formData.route}
              onChange={(e) => setFormData({ ...formData, route: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select route</option>
              <option value="oral">Oral</option>
              <option value="iv">IV</option>
              <option value="im">IM</option>
              <option value="sc">Subcutaneous</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Administration Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Patient response, side effects, etc..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
          <div className="flex gap-2 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Confirm Administration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const NursingDashboard = () => {
  // Queries
  const { data: patientQueue, isLoading: queueLoading, error: queueError, refetch } = usePatientQueue();
  const { data: medicationsDueCount, isLoading: medicationsLoading } = useMedicationsDue();
  const { data: vitalsCount, isLoading: vitalsLoading } = useVitalsRecorded();
  const { data: alertsCount, isLoading: alertsLoading } = useCriticalAlerts();

  // New queries for dashboard features
  const { data: nursingTasks = [] } = useNursingTasks();
  const { data: assignedPatients = [] } = useAssignedPatients();
  const { data: medicationsList = [] } = useMedicationsDueList();
  const { data: criticalAlerts = [] } = useCriticalAlerts2();

  // State management
  const [selectedTask, setSelectedTask] = useState<NursingTask | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<AssignedPatient | null>(null);
  const [selectedMedication, setSelectedMedication] = useState<MedicationDue | null>(null);
  const [processing, setProcessing] = useState(false);

  // Modal states
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showVitalsHistoryModal, setShowVitalsHistoryModal] = useState(false);
  const [showRecordVitalsModal, setShowRecordVitalsModal] = useState(false);
  const [showCarePlanModal, setShowCarePlanModal] = useState(false);
  const [showMedicationModal, setShowMedicationModal] = useState(false);

  // Task actions
  const handleMarkTaskComplete = async (taskId: string) => {
    setProcessing(true);
    try {
      console.log('Marking task complete:', taskId);
      // Update task status
      setProcessing(false);
    } catch (err) {
      console.error('Error marking task complete:', err);
      setProcessing(false);
    }
  };

  // Patient actions
  const handlePatientAction = (patient: AssignedPatient, action: string) => {
    setSelectedPatient(patient);
    if (action === 'vitals') {
      setShowVitalsHistoryModal(true);
    } else if (action === 'meds') {
      setShowMedicationModal(true);
    } else if (action === 'care-plan') {
      setShowCarePlanModal(true);
    }
  };

  // Medication actions
  const handleAdministerMedication = (medication: MedicationDue) => {
    setSelectedMedication(medication);
    setShowMedicationModal(true);
  };

  const handleSaveMedication = async (data: any) => {
    setProcessing(true);
    try {
      console.log('Medication administered:', data);
      // Save to database
      setShowMedicationModal(false);
      setSelectedMedication(null);
      setProcessing(false);
    } catch (err) {
      console.error('Error administering medication:', err);
      setProcessing(false);
    }
  };

  const handleSaveCarePlan = async (data: any) => {
    setProcessing(true);
    try {
      console.log('Care plan saved:', data);
      // Save to database
      setShowCarePlanModal(false);
      setSelectedPatient(null);
      setProcessing(false);
    } catch (err) {
      console.error('Error saving care plan:', err);
      setProcessing(false);
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'High':
      case 'Critical':
        return 'bg-red-100 text-red-800';
      case 'Medium':
        return 'bg-blue-100 text-blue-800';
      case 'Low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-pink-100 text-pink-800';
      case 'Completed':
      case 'Done':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Nursing Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Your scheduled tasks and responsibilities
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 font-semibold">Patients Waiting</div>
          <div className="text-3xl font-bold text-blue-600 mt-1">
            {queueLoading ? '...' : patientQueue?.length ?? 0}
          </div>
          <div className="text-xs text-gray-500 mt-1">In queue</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 font-semibold">Medications Due</div>
          <div className="text-3xl font-bold text-green-600 mt-1">
            {medicationsLoading ? '...' : medicationsList.length}
          </div>
          <div className="text-xs text-gray-500 mt-1">To administer</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 font-semibold">Vitals Recorded</div>
          <div className="text-3xl font-bold text-purple-600 mt-1">
            {vitalsLoading ? '...' : vitalsCount ?? 0}
          </div>
          <div className="text-xs text-gray-500 mt-1">Today</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 font-semibold">Critical Alerts</div>
          <div className="text-3xl font-bold text-red-600 mt-1">
            {alertsLoading ? '...' : criticalAlerts.length}
          </div>
          <div className="text-xs text-gray-500 mt-1">Requiring attention</div>
        </div>
      </div>

      {/* Critical Patient Alerts */}
      {criticalAlerts.length > 0 && (
        <div className="border-l-4 border-red-500 bg-red-50 p-4 rounded">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <h3 className="font-bold text-red-800 text-lg">Critical Patient Alerts</h3>
              <p className="text-sm text-red-700 mt-1">Patients requiring immediate attention</p>
              {criticalAlerts.map((alert) => (
                <div key={alert.id} className="mt-3 bg-white rounded p-3 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-800">{alert.patient}</p>
                    <p className="text-sm text-gray-600">{alert.room} - {alert.alert}</p>
                  </div>
                  <button className="bg-red-600 text-white px-4 py-1 rounded text-sm hover:bg-red-700">
                    Respond
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Today's Nursing Tasks */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Today's Nursing Tasks</h2>
          <p className="text-sm text-gray-600 mt-1">Your scheduled tasks and responsibilities</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Task</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Patient</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Priority</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Due Time</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {nursingTasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-800 font-medium">{task.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{task.patient}</td>
                  <td className="px-4 py-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityBadgeColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{task.dueTime}</td>
                  <td className="px-4 py-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(task.status)}`}>
                      {task.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {task.status === 'Pending' && (
                      <button
                        onClick={() => handleMarkTaskComplete(task.id)}
                        disabled={processing}
                        className="text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                      >
                        Mark Complete
                      </button>
                    )}
                    {task.status === 'Completed' && (
                      <span className="text-gray-500">Done</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assigned Patients */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Assigned Patients</h2>
              <p className="text-sm text-gray-600 mt-1">Patients under your care today</p>
            </div>
            <button className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200">
              Export
            </button>
          </div>
          <div className="space-y-3 p-4">
            {assignedPatients.map((patient) => (
              <div key={patient.id} className="border border-gray-200 rounded-lg p-4 hover:bg-blue-50">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800">{patient.name}</h3>
                    <p className="text-sm text-gray-600">{patient.room}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityBadgeColor(patient.priority)}`}>
                    {patient.priority}
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handlePatientAction(patient, 'vitals')}
                    className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                  >
                    <Eye size={14} />
                    Vitals
                  </button>
                  <button
                    onClick={() => handlePatientAction(patient, 'meds')}
                    className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                  >
                    <Pill size={14} />
                    Meds
                  </button>
                  <button className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200">
                    <FileText size={14} />
                    History
                  </button>
                  <button
                    onClick={() => handlePatientAction(patient, 'care-plan')}
                    className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                  >
                    <FileText size={14} />
                    Care Plan
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Medication Schedule */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Medication Schedule</h2>
              <p className="text-sm text-gray-600 mt-1">Medications due for administration</p>
            </div>
            <button className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200">
              Export
            </button>
          </div>
          <div className="space-y-3 p-4">
            {medicationsList.map((med) => (
              <div key={med.id} className="border border-gray-200 rounded-lg p-4 hover:bg-blue-50">
                <div className="mb-3">
                  <h3 className="font-semibold text-gray-800">{med.patient}</h3>
                  <p className="text-sm text-gray-600">{med.medication}</p>
                  <p className="text-xs text-gray-500 mt-1">Due: {med.dueTime}</p>
                </div>
                <div className="flex gap-2">
                  {med.status === 'Pending' && (
                    <>
                      <span className="inline-block px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
                        Urgent
                      </span>
                      <button
                        onClick={() => handleAdministerMedication(med)}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 font-medium"
                      >
                        Administer
                      </button>
                      <button className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 font-medium">
                        Cancel
                      </button>
                    </>
                  )}
                  {med.status === 'Done' && (
                    <span className="flex items-center gap-1 text-green-600 text-xs font-semibold">
                      <CheckCircle size={14} />
                      Done
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      <VitalsHistoryModal
        isOpen={showVitalsHistoryModal}
        onClose={() => (setShowVitalsHistoryModal(false), setSelectedPatient(null))}
        patient={selectedPatient}
        onRecordNew={() => (setShowVitalsHistoryModal(false), setShowRecordVitalsModal(true))}
      />

      <RecordVitalsModal
        isOpen={showRecordVitalsModal}
        onClose={() => (setShowRecordVitalsModal(false), setSelectedPatient(null))}
        patient={selectedPatient}
        onRecorded={() => {
          // Refresh vitals history after recording
          setShowVitalsHistoryModal(true);
        }}
      />

      <CreateCarePlanModal
        isOpen={showCarePlanModal}
        onClose={() => (setShowCarePlanModal(false), setSelectedPatient(null))}
        patient={selectedPatient}
        onSave={handleSaveCarePlan}
      />

      <AdministerMedicationModal
        isOpen={showMedicationModal}
        onClose={() => (setShowMedicationModal(false), setSelectedMedication(null))}
        medicationDue={selectedMedication}
        onSave={handleSaveMedication}
      />
    </div>
  );
};

export default NursingDashboard;
