import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Search, Stethoscope, Calendar, User, Heart, Thermometer, Wind } from 'lucide-react';
import { format } from 'date-fns';
import PermissionGuard from '@/components/layout/PermissionGuard';

interface MedicalExamination {
  id: string;
  patient_id: string;
  examination_date: string;
  examined_by: string;
  triage_temperature: number | null;
  triage_blood_pressure: string | null;
  triage_pulse_rate: number | null;
  triage_respiratory_rate: number | null;
  triage_oxygen_saturation: number | null;
  triage_weight: number | null;
  triage_height: number | null;
  triage_bmi: number | null;
  triage_notes: string | null;
  chief_complaint: string;
  history_of_present_illness: string | null;
  past_medical_history: string | null;
  past_surgical_history: string | null;
  medication_list: string | null;
  allergies: string | null;
  family_history: string | null;
  social_history: string | null;
  general_appearance: string | null;
  heent_examination: string | null;
  cardiovascular_examination: string | null;
  respiratory_examination: string | null;
  abdominal_examination: string | null;
  neurological_examination: string | null;
  musculoskeletal_examination: string | null;
  skin_examination: string | null;
  other_systems: string | null;
  assessment_diagnosis: string;
  plan_treatment: string | null;
  medications_prescribed: string | null;
  follow_up_date: string | null;
  referrals: string | null;
  created_at: string;
  updated_at: string;
  patients?: {
    first_name: string;
    last_name: string;
    patient_number: string;
    date_of_birth: string;
  };
}

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  patient_number: string;
  date_of_birth: string;
}

const DoctorExamination = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedExamination, setSelectedExamination] = useState<MedicalExamination | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientList, setShowPatientList] = useState(false);

  const [newExamination, setNewExamination] = useState({
    patient_id: '',
    chief_complaint: '',
    triage_temperature: '',
    triage_blood_pressure: '',
    triage_pulse_rate: '',
    triage_respiratory_rate: '',
    triage_oxygen_saturation: '',
    triage_weight: '',
    triage_height: '',
    history_of_present_illness: '',
    past_medical_history: '',
    past_surgical_history: '',
    medication_list: '',
    allergies: '',
    family_history: '',
    social_history: '',
    general_appearance: '',
    heent_examination: '',
    cardiovascular_examination: '',
    respiratory_examination: '',
    abdominal_examination: '',
    neurological_examination: '',
    musculoskeletal_examination: '',
    skin_examination: '',
    other_systems: '',
    assessment_diagnosis: '',
    plan_treatment: '',
    medications_prescribed: '',
    follow_up_date: '',
    referrals: '',
  });

  // Fetch patients for selection
  const { data: patients } = useQuery({
    queryKey: ['patients-for-exam'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name, patient_number, date_of_birth')
        .order('first_name');
      if (error) throw error;
      return data as Patient[];
    },
  });

  const filteredPatients = patients?.filter(
    (p) =>
      p.first_name.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.last_name.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.patient_number.toLowerCase().includes(patientSearch.toLowerCase())
  );

  // Fetch examinations
  const { data: examinations, isLoading } = useQuery({
    queryKey: ['medical-examinations'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('medical_examinations')
        .select('*, patients(first_name, last_name, patient_number, date_of_birth)')
        .order('examination_date', { ascending: false });
      if (error) throw error;
      return data as unknown as MedicalExamination[];
    },
  });

  const filteredExaminations = examinations?.filter((e) => {
    const patientName = `${e.patients?.first_name} ${e.patients?.last_name}`.toLowerCase();
    return (
      patientName.includes(searchTerm.toLowerCase()) ||
      e.patients?.patient_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.chief_complaint.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Create examination mutation
  const createExaminationMutation = useMutation({
    mutationFn: async (data: typeof newExamination) => {
      // Calculate BMI if weight and height are provided
      let bmi = null;
      if (data.triage_weight && data.triage_height) {
        const heightInMeters = parseFloat(data.triage_height) / 100;
        bmi = parseFloat(data.triage_weight) / (heightInMeters * heightInMeters);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: result, error } = await (supabase as any)
        .from('medical_examinations')
        .insert({
          patient_id: data.patient_id,
          examined_by: user?.id,
          chief_complaint: data.chief_complaint,
          triage_temperature: data.triage_temperature ? parseFloat(data.triage_temperature) : null,
          triage_blood_pressure: data.triage_blood_pressure || null,
          triage_pulse_rate: data.triage_pulse_rate ? parseInt(data.triage_pulse_rate) : null,
          triage_respiratory_rate: data.triage_respiratory_rate ? parseInt(data.triage_respiratory_rate) : null,
          triage_oxygen_saturation: data.triage_oxygen_saturation ? parseFloat(data.triage_oxygen_saturation) : null,
          triage_weight: data.triage_weight ? parseFloat(data.triage_weight) : null,
          triage_height: data.triage_height ? parseFloat(data.triage_height) : null,
          triage_bmi: bmi,
          history_of_present_illness: data.history_of_present_illness || null,
          past_medical_history: data.past_medical_history || null,
          past_surgical_history: data.past_surgical_history || null,
          medication_list: data.medication_list || null,
          allergies: data.allergies || null,
          family_history: data.family_history || null,
          social_history: data.social_history || null,
          general_appearance: data.general_appearance || null,
          heent_examination: data.heent_examination || null,
          cardiovascular_examination: data.cardiovascular_examination || null,
          respiratory_examination: data.respiratory_examination || null,
          abdominal_examination: data.abdominal_examination || null,
          neurological_examination: data.neurological_examination || null,
          musculoskeletal_examination: data.musculoskeletal_examination || null,
          skin_examination: data.skin_examination || null,
          other_systems: data.other_systems || null,
          assessment_diagnosis: data.assessment_diagnosis,
          plan_treatment: data.plan_treatment || null,
          medications_prescribed: data.medications_prescribed || null,
          follow_up_date: data.follow_up_date || null,
          referrals: data.referrals || null,
        })
        .select();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-examinations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setIsAddDialogOpen(false);
      setNewExamination({
        patient_id: '',
        chief_complaint: '',
        triage_temperature: '',
        triage_blood_pressure: '',
        triage_pulse_rate: '',
        triage_respiratory_rate: '',
        triage_oxygen_saturation: '',
        triage_weight: '',
        triage_height: '',
        history_of_present_illness: '',
        past_medical_history: '',
        past_surgical_history: '',
        medication_list: '',
        allergies: '',
        family_history: '',
        social_history: '',
        general_appearance: '',
        heent_examination: '',
        cardiovascular_examination: '',
        respiratory_examination: '',
        abdominal_examination: '',
        neurological_examination: '',
        musculoskeletal_examination: '',
        skin_examination: '',
        other_systems: '',
        assessment_diagnosis: '',
        plan_treatment: '',
        medications_prescribed: '',
        follow_up_date: '',
        referrals: '',
      });
      setSelectedPatientId('');
      toast.success('Medical examination recorded successfully');
    },
    onError: (error: Error) => {
      console.error('[EXAMINATION ERROR]', error.message);
      toast.error(error.message);
    },
  });

  const handleAddExamination = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamination.patient_id || !newExamination.chief_complaint) {
      toast.error('Please select a patient and enter chief complaint');
      return;
    }
    createExaminationMutation.mutate(newExamination);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Doctor's Examination</h1>
          <p className="text-muted-foreground">Manage patient medical examinations and consultations</p>
        </div>
        <PermissionGuard module="patients" action="create">
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Examination
          </Button>
        </PermissionGuard>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Stethoscope className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{examinations?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Total Examinations</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Examinations List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Examination Records</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by patient name, ID, or complaint..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading examinations...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Chief Complaint</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Temperature</TableHead>
                  <TableHead>BP</TableHead>
                  <TableHead>Diagnosis</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExaminations?.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell className="font-medium">
                      {exam.patients?.first_name} {exam.patients?.last_name}
                      <br />
                      <span className="text-xs text-muted-foreground">{exam.patients?.patient_number}</span>
                    </TableCell>
                    <TableCell>{exam.chief_complaint}</TableCell>
                    <TableCell>
                      {format(new Date(exam.examination_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {exam.triage_temperature ? `${exam.triage_temperature}°C` : '-'}
                    </TableCell>
                    <TableCell>
                      {exam.triage_blood_pressure || '-'}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{exam.assessment_diagnosis}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedExamination(exam);
                          setIsViewDialogOpen(true);
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredExaminations?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No examinations found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New Examination Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Medical Examination</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddExamination} className="space-y-6">
            {/* Patient Selection */}
            <div className="space-y-2">
              <Label>Select Patient</Label>
              <div className="relative">
                <Input
                  placeholder="Search patient..."
                  value={patientSearch}
                  onChange={(e) => {
                    setPatientSearch(e.target.value);
                    setShowPatientList(true);
                  }}
                  onFocus={() => setShowPatientList(true)}
                />
                {showPatientList && filteredPatients && filteredPatients.length > 0 && (
                  <div className="absolute top-full left-0 right-0 border rounded-md bg-white shadow-lg z-50 max-h-60 overflow-y-auto">
                    {filteredPatients.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedPatientId(p.id);
                          setNewExamination({ ...newExamination, patient_id: p.id });
                          setPatientSearch(`${p.first_name} ${p.last_name}`);
                          setShowPatientList(false);
                        }}
                        className="w-full text-left p-3 hover:bg-gray-100 border-b last:border-b-0"
                      >
                        <div className="font-medium">{p.first_name} {p.last_name}</div>
                        <div className="text-sm text-muted-foreground">{p.patient_number}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedPatientId && (
                <div className="text-sm text-green-600">Patient selected: {patientSearch}</div>
              )}
            </div>

            {/* Chief Complaint */}
            <div className="space-y-2">
              <Label htmlFor="chief_complaint">Chief Complaint *</Label>
              <Textarea
                id="chief_complaint"
                value={newExamination.chief_complaint}
                onChange={(e) =>
                  setNewExamination({ ...newExamination, chief_complaint: e.target.value })
                }
                placeholder="Patient's main reason for visit"
                rows={3}
              />
            </div>

            {/* Triage Vitals */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Thermometer className="h-4 w-4" />
                Triage Vital Signs
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="temperature">Temperature (°C)</Label>
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    value={newExamination.triage_temperature}
                    onChange={(e) =>
                      setNewExamination({ ...newExamination, triage_temperature: e.target.value })
                    }
                    placeholder="e.g., 37.5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="blood_pressure">Blood Pressure</Label>
                  <Input
                    id="blood_pressure"
                    value={newExamination.triage_blood_pressure}
                    onChange={(e) =>
                      setNewExamination({ ...newExamination, triage_blood_pressure: e.target.value })
                    }
                    placeholder="e.g., 120/80"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pulse_rate">Pulse Rate (bpm)</Label>
                  <Input
                    id="pulse_rate"
                    type="number"
                    value={newExamination.triage_pulse_rate}
                    onChange={(e) =>
                      setNewExamination({ ...newExamination, triage_pulse_rate: e.target.value })
                    }
                    placeholder="e.g., 72"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="respiratory_rate">Respiratory Rate (/min)</Label>
                  <Input
                    id="respiratory_rate"
                    type="number"
                    value={newExamination.triage_respiratory_rate}
                    onChange={(e) =>
                      setNewExamination({
                        ...newExamination,
                        triage_respiratory_rate: e.target.value,
                      })
                    }
                    placeholder="e.g., 16"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="oxygen_saturation">O₂ Saturation (%)</Label>
                  <Input
                    id="oxygen_saturation"
                    type="number"
                    step="0.1"
                    value={newExamination.triage_oxygen_saturation}
                    onChange={(e) =>
                      setNewExamination({
                        ...newExamination,
                        triage_oxygen_saturation: e.target.value,
                      })
                    }
                    placeholder="e.g., 98.5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={newExamination.triage_weight}
                    onChange={(e) =>
                      setNewExamination({ ...newExamination, triage_weight: e.target.value })
                    }
                    placeholder="e.g., 75.5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    step="0.1"
                    value={newExamination.triage_height}
                    onChange={(e) =>
                      setNewExamination({ ...newExamination, triage_height: e.target.value })
                    }
                    placeholder="e.g., 180"
                  />
                </div>
              </div>
            </div>

            {/* History Section */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-4">Medical History</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hpi">History of Present Illness</Label>
                  <Textarea
                    id="hpi"
                    value={newExamination.history_of_present_illness}
                    onChange={(e) =>
                      setNewExamination({
                        ...newExamination,
                        history_of_present_illness: e.target.value,
                      })
                    }
                    placeholder="Detailed history of current illness"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ppmh">Past Medical History</Label>
                    <Textarea
                      id="ppmh"
                      value={newExamination.past_medical_history}
                      onChange={(e) =>
                        setNewExamination({
                          ...newExamination,
                          past_medical_history: e.target.value,
                        })
                      }
                      placeholder="Previous illnesses, chronic conditions"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ppsh">Past Surgical History</Label>
                    <Textarea
                      id="ppsh"
                      value={newExamination.past_surgical_history}
                      onChange={(e) =>
                        setNewExamination({
                          ...newExamination,
                          past_surgical_history: e.target.value,
                        })
                      }
                      placeholder="Previous surgeries and procedures"
                      rows={2}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="medications">Medications</Label>
                    <Textarea
                      id="medications"
                      value={newExamination.medication_list}
                      onChange={(e) =>
                        setNewExamination({
                          ...newExamination,
                          medication_list: e.target.value,
                        })
                      }
                      placeholder="Current medications and doses"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="allergies">Allergies</Label>
                    <Textarea
                      id="allergies"
                      value={newExamination.allergies}
                      onChange={(e) =>
                        setNewExamination({ ...newExamination, allergies: e.target.value })
                      }
                      placeholder="Drug allergies and other allergies"
                      rows={2}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="family">Family History</Label>
                    <Textarea
                      id="family"
                      value={newExamination.family_history}
                      onChange={(e) =>
                        setNewExamination({
                          ...newExamination,
                          family_history: e.target.value,
                        })
                      }
                      placeholder="Family medical history"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="social">Social History</Label>
                    <Textarea
                      id="social"
                      value={newExamination.social_history}
                      onChange={(e) =>
                        setNewExamination({
                          ...newExamination,
                          social_history: e.target.value,
                        })
                      }
                      placeholder="Occupation, smoking, alcohol, drug use"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Physical Examination Section */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-4">Physical Examination</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="general">General Appearance</Label>
                  <Textarea
                    id="general"
                    value={newExamination.general_appearance}
                    onChange={(e) =>
                      setNewExamination({
                        ...newExamination,
                        general_appearance: e.target.value,
                      })
                    }
                    placeholder="General appearance and condition"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="heent">HEENT Examination</Label>
                    <Textarea
                      id="heent"
                      value={newExamination.heent_examination}
                      onChange={(e) =>
                        setNewExamination({
                          ...newExamination,
                          heent_examination: e.target.value,
                        })
                      }
                      placeholder="Head, Eyes, Ears, Nose, Throat findings"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cardiac">Cardiovascular Examination</Label>
                    <Textarea
                      id="cardiac"
                      value={newExamination.cardiovascular_examination}
                      onChange={(e) =>
                        setNewExamination({
                          ...newExamination,
                          cardiovascular_examination: e.target.value,
                        })
                      }
                      placeholder="Heart sounds, murmurs, pulse"
                      rows={2}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="respiratory">Respiratory Examination</Label>
                    <Textarea
                      id="respiratory"
                      value={newExamination.respiratory_examination}
                      onChange={(e) =>
                        setNewExamination({
                          ...newExamination,
                          respiratory_examination: e.target.value,
                        })
                      }
                      placeholder="Lung sounds, breathing pattern"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="abdominal">Abdominal Examination</Label>
                    <Textarea
                      id="abdominal"
                      value={newExamination.abdominal_examination}
                      onChange={(e) =>
                        setNewExamination({
                          ...newExamination,
                          abdominal_examination: e.target.value,
                        })
                      }
                      placeholder="Palpation, percussion, auscultation findings"
                      rows={2}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="neuro">Neurological Examination</Label>
                    <Textarea
                      id="neuro"
                      value={newExamination.neurological_examination}
                      onChange={(e) =>
                        setNewExamination({
                          ...newExamination,
                          neurological_examination: e.target.value,
                        })
                      }
                      placeholder="Cranial nerves, motor, sensory, reflexes"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="musculo">Musculoskeletal Examination</Label>
                    <Textarea
                      id="musculo"
                      value={newExamination.musculoskeletal_examination}
                      onChange={(e) =>
                        setNewExamination({
                          ...newExamination,
                          musculoskeletal_examination: e.target.value,
                        })
                      }
                      placeholder="Range of motion, deformities, strength"
                      rows={2}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="skin">Skin Examination</Label>
                  <Textarea
                    id="skin"
                    value={newExamination.skin_examination}
                    onChange={(e) =>
                      setNewExamination({
                        ...newExamination,
                        skin_examination: e.target.value,
                      })
                    }
                    placeholder="Color, lesions, turgor, rashes"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="other">Other Systems</Label>
                  <Textarea
                    id="other"
                    value={newExamination.other_systems}
                    onChange={(e) =>
                      setNewExamination({ ...newExamination, other_systems: e.target.value })
                    }
                    placeholder="Any other relevant findings"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Assessment and Plan */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-4">Assessment & Plan</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="diagnosis">Assessment/Diagnosis *</Label>
                  <Textarea
                    id="diagnosis"
                    value={newExamination.assessment_diagnosis}
                    onChange={(e) =>
                      setNewExamination({
                        ...newExamination,
                        assessment_diagnosis: e.target.value,
                      })
                    }
                    placeholder="Clinical assessment and diagnosis"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="plan">Treatment Plan</Label>
                    <Textarea
                      id="plan"
                      value={newExamination.plan_treatment}
                      onChange={(e) =>
                        setNewExamination({
                          ...newExamination,
                          plan_treatment: e.target.value,
                        })
                      }
                      placeholder="Treatment plan and management"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prescribed">Medications Prescribed</Label>
                    <Textarea
                      id="prescribed"
                      value={newExamination.medications_prescribed}
                      onChange={(e) =>
                        setNewExamination({
                          ...newExamination,
                          medications_prescribed: e.target.value,
                        })
                      }
                      placeholder="Medication names, doses, and instructions"
                      rows={2}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="followup">Follow-up Date</Label>
                    <Input
                      id="followup"
                      type="date"
                      value={newExamination.follow_up_date}
                      onChange={(e) =>
                        setNewExamination({
                          ...newExamination,
                          follow_up_date: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="referrals">Referrals</Label>
                    <Input
                      id="referrals"
                      value={newExamination.referrals}
                      onChange={(e) =>
                        setNewExamination({
                          ...newExamination,
                          referrals: e.target.value,
                        })
                      }
                      placeholder="e.g., Cardiology, Physical Therapy"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createExaminationMutation.isPending}
              >
                {createExaminationMutation.isPending ? 'Saving...' : 'Save Examination'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Examination Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Medical Examination Report</DialogTitle>
          </DialogHeader>
          {selectedExamination && (
            <div className="space-y-6">
              {/* Patient Info */}
              <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                <div>
                  <p className="text-sm text-muted-foreground">Patient</p>
                  <p className="text-lg font-semibold">
                    {selectedExamination.patients?.first_name}{' '}
                    {selectedExamination.patients?.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedExamination.patients?.patient_number}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Examination Date</p>
                  <p className="text-lg font-semibold">
                    {format(new Date(selectedExamination.examination_date), 'MMMM d, yyyy HH:mm')}
                  </p>
                </div>
              </div>

              {/* Chief Complaint */}
              <div>
                <h3 className="font-semibold mb-2">Chief Complaint</h3>
                <p>{selectedExamination.chief_complaint}</p>
              </div>

              {/* Vital Signs */}
              {(selectedExamination.triage_temperature ||
                selectedExamination.triage_blood_pressure) && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Thermometer className="h-4 w-4" />
                    Vital Signs
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {selectedExamination.triage_temperature && (
                      <div className="p-3 rounded-lg bg-slate-50">
                        <p className="text-xs text-muted-foreground">Temperature</p>
                        <p className="text-lg font-semibold">
                          {selectedExamination.triage_temperature}°C
                        </p>
                      </div>
                    )}
                    {selectedExamination.triage_blood_pressure && (
                      <div className="p-3 rounded-lg bg-slate-50">
                        <p className="text-xs text-muted-foreground">Blood Pressure</p>
                        <p className="text-lg font-semibold">
                          {selectedExamination.triage_blood_pressure}
                        </p>
                      </div>
                    )}
                    {selectedExamination.triage_pulse_rate && (
                      <div className="p-3 rounded-lg bg-slate-50">
                        <p className="text-xs text-muted-foreground">Pulse Rate</p>
                        <p className="text-lg font-semibold">
                          {selectedExamination.triage_pulse_rate} bpm
                        </p>
                      </div>
                    )}
                    {selectedExamination.triage_oxygen_saturation && (
                      <div className="p-3 rounded-lg bg-slate-50">
                        <p className="text-xs text-muted-foreground">O₂ Saturation</p>
                        <p className="text-lg font-semibold">
                          {selectedExamination.triage_oxygen_saturation}%
                        </p>
                      </div>
                    )}
                    {selectedExamination.triage_bmi && (
                      <div className="p-3 rounded-lg bg-slate-50">
                        <p className="text-xs text-muted-foreground">BMI</p>
                        <p className="text-lg font-semibold">
                          {selectedExamination.triage_bmi.toFixed(1)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Medical History */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedExamination.history_of_present_illness && (
                  <div>
                    <h4 className="font-semibold mb-2">History of Present Illness</h4>
                    <p className="text-sm">{selectedExamination.history_of_present_illness}</p>
                  </div>
                )}
                {selectedExamination.past_medical_history && (
                  <div>
                    <h4 className="font-semibold mb-2">Past Medical History</h4>
                    <p className="text-sm">{selectedExamination.past_medical_history}</p>
                  </div>
                )}
                {selectedExamination.allergies && (
                  <div>
                    <h4 className="font-semibold mb-2">Allergies</h4>
                    <p className="text-sm">{selectedExamination.allergies}</p>
                  </div>
                )}
                {selectedExamination.medication_list && (
                  <div>
                    <h4 className="font-semibold mb-2">Current Medications</h4>
                    <p className="text-sm">{selectedExamination.medication_list}</p>
                  </div>
                )}
              </div>

              {/* Physical Exam */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Physical Examination</h3>
                <div className="space-y-3">
                  {selectedExamination.general_appearance && (
                    <div>
                      <h4 className="font-medium">General Appearance</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedExamination.general_appearance}
                      </p>
                    </div>
                  )}
                  {selectedExamination.cardiovascular_examination && (
                    <div>
                      <h4 className="font-medium flex items-center gap-2">
                        <Heart className="h-4 w-4" />
                        Cardiovascular
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedExamination.cardiovascular_examination}
                      </p>
                    </div>
                  )}
                  {selectedExamination.respiratory_examination && (
                    <div>
                      <h4 className="font-medium flex items-center gap-2">
                        <Wind className="h-4 w-4" />
                        Respiratory
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedExamination.respiratory_examination}
                      </p>
                    </div>
                  )}
                  {selectedExamination.abdominal_examination && (
                    <div>
                      <h4 className="font-medium">Abdominal</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedExamination.abdominal_examination}
                      </p>
                    </div>
                  )}
                  {selectedExamination.neurological_examination && (
                    <div>
                      <h4 className="font-medium">Neurological</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedExamination.neurological_examination}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Assessment & Plan */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Assessment & Plan</h3>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium">Diagnosis</h4>
                    <p className="text-sm">{selectedExamination.assessment_diagnosis}</p>
                  </div>
                  {selectedExamination.plan_treatment && (
                    <div>
                      <h4 className="font-medium">Treatment Plan</h4>
                      <p className="text-sm">{selectedExamination.plan_treatment}</p>
                    </div>
                  )}
                  {selectedExamination.medications_prescribed && (
                    <div>
                      <h4 className="font-medium">Medications</h4>
                      <p className="text-sm">{selectedExamination.medications_prescribed}</p>
                    </div>
                  )}
                  {selectedExamination.follow_up_date && (
                    <div>
                      <h4 className="font-medium">Follow-up</h4>
                      <p className="text-sm">
                        {format(new Date(selectedExamination.follow_up_date), 'MMMM d, yyyy')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DoctorExamination;
