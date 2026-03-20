import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Users, RefreshCw } from 'lucide-react';
import { PatientReassignmentButton } from '@/components/admin/PatientReassignmentDialog';
import { PatientDetailsModals } from './PatientDetailsModals';
import { toast } from 'sonner';

export const AssignedPatientsWithReassignment: React.FC = () => {
  const { user } = useAuth();
  const [isAdminView, setIsAdminView] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'vitals' | 'meds' | 'history' | 'care-plan'>('vitals');

  // Check if current user is admin
  const { data: userRole } = useQuery({
    queryKey: ['user-role', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id)
        .single();

      if (error) {
        console.error('[AssignedPatientsWithReassignment] Error fetching role:', error);
        return null;
      }

      return data?.role;
    },
  });

  const isAdmin = userRole === 'admin';

  // Fetch all assigned patients (for admin) or current user's assignments (for nurse)
  const { data: assignedPatients, isLoading, refetch } = useQuery({
    queryKey: ['assigned-patients', isAdminView, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      try {
        const today = new Date().toISOString().split('T')[0];

        // Query patient_assignments with patient details
        // @ts-expect-error - Supabase type instantiation complexity with nested selects
        let query = supabase
          .from('patient_assignments')
          .select('id, patient_id, nurse_id, shift_date, priority, patient:patients(id, first_name, last_name, patient_number, date_of_birth)')
          .eq('shift_date', today);

        // Apply filters
        if (!isAdminView && !isAdmin) {
          // @ts-expect-error - Supabase type instantiation complexity
          query = query.eq('nurse_id', user?.id || '');
        }

        const { data: assignments, error: assignError } = await query.order('created_at', { ascending: false });

        if (assignError) {
          console.error('[AssignedPatientsWithReassignment] Error fetching assignments:', assignError);
          return [];
        }

        return (assignments || []).map((assignment: any) => ({
          ...assignment,
          // Ensure patient data has required fields
          patient: assignment.patient || {
            id: assignment.patient_id,
            first_name: 'Unknown',
            last_name: 'Patient',
            patient_number: 'N/A',
            date_of_birth: null,
          },
        }));
      } catch (err) {
        console.error('[AssignedPatientsWithReassignment] Query error:', err);
        return [];
      }
    },
  });

  const handleReassignmentSuccess = () => {
    refetch();
    toast.success('Patient reassignment recorded');
  };

  return (
    <div className="space-y-4">
      {/* Header with Admin Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="text-gray-600" size={20} />
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Assigned Patients</h2>
            <p className="text-sm text-gray-600">
              {isAdminView ? 'All patient assignments (Admin View)' : 'Your assigned patients'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              variant={isAdminView ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsAdminView(!isAdminView)}
            >
              {isAdminView ? 'My Patients' : 'All Patients'}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* Patients Table */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading patients...</div>
      ) : assignedPatients && assignedPatients.length > 0 ? (
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">Patient List</h3>
            <p className="text-sm text-gray-600 mt-1">
              Showing {assignedPatients.length} patient{assignedPatients.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Patient Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Patient ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date of Birth</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Priority</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {assignedPatients.map((assignment: any) => (
                  <tr key={assignment.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-800 font-medium">
                      {assignment.patient?.first_name} {assignment.patient?.last_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {assignment.patient?.patient_number}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {assignment.patient?.date_of_birth || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs font-semibold">
                        {assignment.priority?.charAt(0).toUpperCase() + assignment.priority?.slice(1).toLowerCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button 
                          className="bg-slate-900 hover:bg-slate-800 text-white"
                          size="sm" 
                          title="View vitals"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('[AssignedPatients] Vitals clicked, patient:', assignment.patient);
                            setSelectedPatient(assignment.patient);
                            setActiveTab('vitals');
                            setIsModalOpen(true);
                          }}
                        >
                          Vitals
                        </Button>
                        <Button 
                          className="bg-slate-900 hover:bg-slate-800 text-white"
                          size="sm" 
                          title="Medications"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('[AssignedPatients] Meds clicked, patient:', assignment.patient);
                            setSelectedPatient(assignment.patient);
                            setActiveTab('meds');
                            setIsModalOpen(true);
                          }}
                        >
                          Meds
                        </Button>
                        <Button 
                          className="bg-slate-900 hover:bg-slate-800 text-white"
                          size="sm" 
                          title="History"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('[AssignedPatients] History clicked, patient:', assignment.patient);
                            setSelectedPatient(assignment.patient);
                            setActiveTab('history');
                            setIsModalOpen(true);
                          }}
                        >
                          History
                        </Button>
                        <Button 
                          className="bg-slate-900 hover:bg-slate-800 text-white"
                          size="sm" 
                          title="Care plan"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('[AssignedPatients] Care Plan clicked, patient:', assignment.patient);
                            setSelectedPatient(assignment.patient);
                            setActiveTab('care-plan');
                            setIsModalOpen(true);
                          }}
                        >
                          Care Plan
                        </Button>
                        {isAdmin && (
                          <PatientReassignmentButton
                            patientAssignmentId={assignment.id}
                            patientName={`${assignment.patient?.first_name} ${assignment.patient?.last_name}`}
                            currentNurseName="Assigned Nurse"
                            variant="outline"
                            onSuccess={handleReassignmentSuccess}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-8 text-center">
          <AlertCircle className="mx-auto text-gray-400 mb-2" size={32} />
          <p className="text-gray-600">
            {isAdminView ? 'No patient assignments found' : 'You have no assigned patients yet'}
          </p>
        </div>
      )}

      {/* Patient Details Modal */}
      {selectedPatient && selectedPatient.id && (
        <>
          {console.log('[AssignedPatients] Rendering modal for:', selectedPatient.id, 'isOpen:', isModalOpen)}
          <PatientDetailsModals
            patientId={selectedPatient.id}
            patientName={`${selectedPatient.first_name || 'Unknown'} ${selectedPatient.last_name || 'Patient'}`}
            activeTab={activeTab}
            isOpen={isModalOpen}
            onClose={() => {
              console.log('[AssignedPatients] Modal closed');
              setIsModalOpen(false);
              setSelectedPatient(null);
            }}
          />
        </>
      )}
    </div>
  );
};
