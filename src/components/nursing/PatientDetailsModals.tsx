import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, Activity, AlertCircle } from 'lucide-react';

interface PatientDetailsModalsProps {
  patientId: string;
  patientName: string;
  activeTab?: 'vitals' | 'meds' | 'history' | 'care-plan';
  isOpen: boolean;
  onClose: () => void;
}

export const PatientDetailsModals: React.FC<PatientDetailsModalsProps> = ({
  patientId,
  patientName,
  activeTab = 'vitals',
  isOpen,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const [currentTab, setCurrentTab] = useState(activeTab);

  // Sync currentTab with activeTab prop from parent
  useEffect(() => {
    setCurrentTab(activeTab);
  }, [activeTab, isOpen]);

  // Debug logging
  useEffect(() => {
    if (isOpen) {
      console.log('[PatientDetailsModals] Modal opened for patient:', patientId, patientName);
    }
  }, [isOpen, patientId, patientName]);

  // Vit als form state
  const [vitalsForm, setVitalsForm] = useState({
    temperature: '',
    systolic_bp: '',
    diastolic_bp: '',
    heart_rate: '',
    oxygen_saturation: '',
    respiratory_rate: '',
    weight: '',
    height: '',
  });

  // Medications form state
  const [medsForm, setMedsForm] = useState({
    medication_name: '',
    dosage: '',
    frequency: '',
    duration: '',
    reason: '',
  });

  // Care plan form state
  const [carePlanForm, setCarePlanForm] = useState({
    plan_description: '',
    goals: '',
    interventions: '',
    follow_up: '',
  });

  // Fetch patient vitals
  const { data: vitals, isLoading: vitalsLoading } = useQuery({
    queryKey: ['patient-vitals', patientId],
    enabled: isOpen && currentTab === 'vitals',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vitals')
        .select('*')
        .eq('patient_id', patientId)
        .order('recorded_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch medications
  const { data: medications, isLoading: medsLoading } = useQuery({
    queryKey: ['patient-medications', patientId],
    enabled: isOpen && currentTab === 'meds',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch patient history
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['patient-history', patientId],
    enabled: isOpen && currentTab === 'history',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_history')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch care plan
  const { data: carePlan, isLoading: carePlanLoading } = useQuery({
    queryKey: ['patient-care-plan', patientId],
    enabled: isOpen && currentTab === 'care-plan',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('care_plans')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      return data?.[0] || null;
    },
  });

  // Record vitals mutation
  const recordVitalsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('vitals').insert({
        patient_id: patientId,
        temperature: vitalsForm.temperature ? parseFloat(vitalsForm.temperature) : null,
        blood_pressure_systolic: vitalsForm.systolic_bp ? parseInt(vitalsForm.systolic_bp) : null,
        blood_pressure_diastolic: vitalsForm.diastolic_bp ? parseInt(vitalsForm.diastolic_bp) : null,
        heart_rate: vitalsForm.heart_rate ? parseInt(vitalsForm.heart_rate) : null,
        oxygen_saturation: vitalsForm.oxygen_saturation ? parseFloat(vitalsForm.oxygen_saturation) : null,
        respiratory_rate: vitalsForm.respiratory_rate ? parseInt(vitalsForm.respiratory_rate) : null,
        weight: vitalsForm.weight ? parseFloat(vitalsForm.weight) : null,
        height: vitalsForm.height ? parseFloat(vitalsForm.height) : null,
        recorded_at: new Date().toISOString(),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-vitals', patientId] });
      toast.success('Vitals recorded successfully');
      setVitalsForm({
        temperature: '',
        systolic_bp: '',
        diastolic_bp: '',
        heart_rate: '',
        oxygen_saturation: '',
        respiratory_rate: '',
        weight: '',
        height: '',
      });
    },
    onError: (error: Error) => toast.error(`Failed to record vitals: ${error.message}`),
  });

  // Add medication mutation
  const addMedicationMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('medications').insert({
        patient_id: patientId,
        medication_name: medsForm.medication_name,
        dosage: medsForm.dosage,
        frequency: medsForm.frequency,
        duration: medsForm.duration,
        reason: medsForm.reason,
        status: 'active',
        created_at: new Date().toISOString(),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-medications', patientId] });
      toast.success('Medication added successfully');
      setMedsForm({
        medication_name: '',
        dosage: '',
        frequency: '',
        duration: '',
        reason: '',
      });
    },
    onError: (error: Error) => toast.error(`Failed to add medication: ${error.message}`),
  });

  // Update care plan mutation
  const updateCarePlanMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('care_plans').upsert({
        patient_id: patientId,
        plan_description: carePlanForm.plan_description,
        goals: carePlanForm.goals,
        interventions: carePlanForm.interventions,
        follow_up: carePlanForm.follow_up,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-care-plan', patientId] });
      toast.success('Care plan updated successfully');
    },
    onError: (error: Error) => toast.error(`Failed to update care plan: ${error.message}`),
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{patientName}</DialogTitle>
          <DialogDescription>Patient Medical Record</DialogDescription>
        </DialogHeader>

        <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as 'vitals' | 'meds' | 'history' | 'care-plan')} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="vitals">Vitals</TabsTrigger>
            <TabsTrigger value="meds">Meds</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="care-plan">Care Plan</TabsTrigger>
          </TabsList>

          {/* Vitals Tab */}
          <TabsContent value="vitals" className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <Activity className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900">Record Vital Signs</h4>
                <p className="text-sm text-blue-700">Enter patient's current vital signs</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Temperature (°C)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="36.5"
                  value={vitalsForm.temperature}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, temperature: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Heart Rate (bpm)</Label>
                <Input
                  type="number"
                  placeholder="72"
                  value={vitalsForm.heart_rate}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, heart_rate: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Systolic BP</Label>
                <Input
                  type="number"
                  placeholder="120"
                  value={vitalsForm.systolic_bp}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, systolic_bp: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Diastolic BP</Label>
                <Input
                  type="number"
                  placeholder="80"
                  value={vitalsForm.diastolic_bp}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, diastolic_bp: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>O2 Saturation (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="98"
                  value={vitalsForm.oxygen_saturation}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, oxygen_saturation: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Respiratory Rate</Label>
                <Input
                  type="number"
                  placeholder="16"
                  value={vitalsForm.respiratory_rate}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, respiratory_rate: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Weight (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="70"
                  value={vitalsForm.weight}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, weight: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Height (cm)</Label>
                <Input
                  type="number"
                  placeholder="170"
                  value={vitalsForm.height}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, height: e.target.value })}
                />
              </div>
            </div>

            <Button
              onClick={() => recordVitalsMutation.mutate()}
              disabled={recordVitalsMutation.isPending}
              className="w-full"
            >
              {recordVitalsMutation.isPending ? 'Recording...' : 'Record Vitals'}
            </Button>

            {/* Recent vitals */}
            <div className="space-y-2">
              <h4 className="font-semibold">Recent Vitals</h4>
              {vitalsLoading ? (
                <p className="text-sm text-gray-500">Loading vitals...</p>
              ) : vitals && vitals.length > 0 ? (
                <div className="space-y-2">
                  {vitals.map((vital: any) => (
                    <Card key={vital.id} className="p-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Temp:</span>
                          <span className="font-semibold ml-1">{vital.temperature}°C</span>
                        </div>
                        <div>
                          <span className="text-gray-600">HR:</span>
                          <span className="font-semibold ml-1">{vital.heart_rate} bpm</span>
                        </div>
                        <div>
                          <span className="text-gray-600">BP:</span>
                          <span className="font-semibold ml-1">
                            {vital.blood_pressure_systolic}/{vital.blood_pressure_diastolic}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">O2:</span>
                          <span className="font-semibold ml-1">{vital.oxygen_saturation}%</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        {new Date(vital.recorded_at).toLocaleString()}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No vitals recorded yet</p>
              )}
            </div>
          </TabsContent>

          {/* Medications Tab */}
          <TabsContent value="meds" className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <Activity className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-green-900">Add Medication</h4>
                <p className="text-sm text-green-700">Record new medication for the patient</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Medication Name *</Label>
                <Input
                  placeholder="e.g., Paracetamol"
                  value={medsForm.medication_name}
                  onChange={(e) => setMedsForm({ ...medsForm, medication_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Dosage</Label>
                  <Input
                    placeholder="e.g., 500mg"
                    value={medsForm.dosage}
                    onChange={(e) => setMedsForm({ ...medsForm, dosage: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Frequency</Label>
                  <Input
                    placeholder="e.g., 3x daily"
                    value={medsForm.frequency}
                    onChange={(e) => setMedsForm({ ...medsForm, frequency: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Duration</Label>
                <Input
                  placeholder="e.g., 7 days"
                  value={medsForm.duration}
                  onChange={(e) => setMedsForm({ ...medsForm, duration: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Reason</Label>
                <Textarea
                  placeholder="Reason for medication..."
                  value={medsForm.reason}
                  onChange={(e) => setMedsForm({ ...medsForm, reason: e.target.value })}
                  rows={2}
                />
              </div>
            </div>

            <Button
              onClick={() => addMedicationMutation.mutate()}
              disabled={addMedicationMutation.isPending || !medsForm.medication_name}
              className="w-full"
            >
              {addMedicationMutation.isPending ? 'Adding...' : 'Add Medication'}
            </Button>

            {/* Current medications */}
            <div className="space-y-2">
              <h4 className="font-semibold">Current Medications</h4>
              {medsLoading ? (
                <p className="text-sm text-gray-500">Loading medications...</p>
              ) : medications && medications.length > 0 ? (
                <div className="space-y-2">
                  {medications.map((med: any) => (
                    <Card key={med.id} className="p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h5 className="font-semibold">{med.medication_name}</h5>
                          <p className="text-sm text-gray-600">{med.dosage} • {med.frequency}</p>
                          {med.reason && <p className="text-xs text-gray-500 mt-1">{med.reason}</p>}
                        </div>
                        <Badge>{med.status}</Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No medications recorded</p>
              )}
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-900">Medical History</h4>
                <p className="text-sm text-amber-700">Patient's past medical conditions</p>
              </div>
            </div>

            {historyLoading ? (
              <p className="text-sm text-gray-500">Loading history...</p>
            ) : history && history.length > 0 ? (
              <div className="space-y-2">
                {history.map((record: any) => (
                  <Card key={record.id} className="p-3">
                    <div className="space-y-1">
                      <h5 className="font-semibold">{record.condition_name}</h5>
                      <p className="text-sm text-gray-600">{record.description}</p>
                      {record.date_diagnosed && (
                        <p className="text-xs text-gray-500">
                          Diagnosed: {new Date(record.date_diagnosed).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No medical history recorded</p>
            )}
          </TabsContent>

          {/* Care Plan Tab */}
          <TabsContent value="care-plan" className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-start gap-3">
              <Heart className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-purple-900">Care Plan</h4>
                <p className="text-sm text-purple-700">Patient's treatment and care plan</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Plan Description</Label>
                <Textarea
                  placeholder="Overall care plan description..."
                  value={carePlanForm.plan_description}
                  onChange={(e) => setCarePlanForm({ ...carePlanForm, plan_description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-1">
                <Label>Goals</Label>
                <Textarea
                  placeholder="Treatment goals..."
                  value={carePlanForm.goals}
                  onChange={(e) => setCarePlanForm({ ...carePlanForm, goals: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-1">
                <Label>Interventions</Label>
                <Textarea
                  placeholder="Planned interventions..."
                  value={carePlanForm.interventions}
                  onChange={(e) => setCarePlanForm({ ...carePlanForm, interventions: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-1">
                <Label>Follow-up</Label>
                <Textarea
                  placeholder="Follow-up plan..."
                  value={carePlanForm.follow_up}
                  onChange={(e) => setCarePlanForm({ ...carePlanForm, follow_up: e.target.value })}
                  rows={2}
                />
              </div>
            </div>

            <Button
              onClick={() => updateCarePlanMutation.mutate()}
              disabled={updateCarePlanMutation.isPending}
              className="w-full"
            >
              {updateCarePlanMutation.isPending ? 'Updating...' : 'Save Care Plan'}
            </Button>

            {carePlanLoading ? (
              <p className="text-sm text-gray-500">Loading care plan...</p>
            ) : carePlan ? (
              <Card className="p-4 bg-gray-50">
                <h5 className="font-semibold mb-2">Current Care Plan</h5>
                <div className="space-y-2 text-sm">
                  {carePlan.plan_description && (
                    <div>
                      <span className="text-gray-600">Description:</span>
                      <p className="mt-1">{carePlan.plan_description}</p>
                    </div>
                  )}
                  {carePlan.goals && (
                    <div>
                      <span className="text-gray-600">Goals:</span>
                      <p className="mt-1">{carePlan.goals}</p>
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              <p className="text-sm text-gray-500">No care plan created yet</p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
