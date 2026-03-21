import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Calendar, User, Stethoscope, X, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface MedicalExamination {
  id: string;
  patient_id: string;
  examination_date: string;
  chief_complaint: string;
  assessment_diagnosis: string;
  history_of_present_illness?: string;
  plan_treatment?: string;
  medications_prescribed?: string;
  follow_up_date?: string;
  examined_by?: string;
  patients?: { first_name: string; last_name: string };
  patient_name?: string;
  triage_temperature?: number;
  triage_blood_pressure?: string;
  triage_pulse_rate?: number;
  triage_respiratory_rate?: number;
  triage_oxygen_saturation?: number;
  triage_weight?: number;
  triage_height?: number;
  triage_bmi?: number;
  triage_notes?: string;
}

interface PatientConsultationHistoryProps {
  examinations: MedicalExamination[];
  isLoading?: boolean;
  onSelectExamination?: (examination: MedicalExamination) => void;
}

export const PatientConsultationHistory: React.FC<PatientConsultationHistoryProps> = ({
  examinations,
  isLoading = false,
  onSelectExamination,
}) => {
  const [selectedModalExam, setSelectedModalExam] = useState<MedicalExamination | null>(null);

  if (isLoading) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Stethoscope className="h-5 w-5" />
            Past Consultations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading consultation history...</p>
        </CardContent>
      </Card>
    );
  }

  if (!examinations || examinations.length === 0) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Stethoscope className="h-5 w-5" />
            Past Consultations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No previous consultations found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Stethoscope className="h-5 w-5" />
            Past Consultations ({examinations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {examinations.map((exam, index) => (
              <div
                key={exam.id}
                className="border border-blue-200 rounded-lg bg-white hover:shadow-md transition-shadow"
              >
                <button
                  onClick={() => setSelectedModalExam(exam)}
                  className="w-full px-4 py-3 flex items-start justify-between gap-3 text-left group hover:bg-blue-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="bg-blue-100 text-blue-900 border-blue-300">
                        Visit {examinations.length - index}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(exam.examination_date), 'MMM dd, yyyy')}
                      </div>
                    </div>
                    <p className="font-semibold text-sm text-blue-900 truncate">
                      {exam.chief_complaint || 'No chief complaint recorded'}
                    </p>
                    {exam.assessment_diagnosis && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        <span className="font-medium">Diagnosis:</span> {exam.assessment_diagnosis}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye className="h-4 w-4 text-blue-600" />
                  </div>
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal Dialog for Full Examination Details */}
      {selectedModalExam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-primary to-blue-700 text-white px-6 py-4 flex items-start justify-between border-b" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
              <div>
                <h2 className="text-2xl font-bold">Consultation Details</h2>
                <p className="text-blue-100 text-sm mt-1">
                  {format(new Date(selectedModalExam.examination_date), 'EEEE, MMMM dd, yyyy')} at{' '}
                  {format(new Date(selectedModalExam.examination_date), 'HH:mm')}
                </p>
              </div>
              <button
                onClick={() => setSelectedModalExam(null)}
                className="p-2 hover:bg-blue-500 rounded-lg transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                  <p className="text-xs font-medium text-gray-600 mb-1">Visit Number</p>
                  <p className="text-lg font-bold text-primary">{examinations.length - examinations.indexOf(selectedModalExam)}</p>
                </div>
                <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                  <p className="text-xs font-medium text-gray-600 mb-1">Date</p>
                  <p className="text-lg font-bold text-primary">
                    {format(new Date(selectedModalExam.examination_date), 'MMM dd, yyyy')}
                  </p>
                </div>
                <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                  <p className="text-xs font-medium text-gray-600 mb-1">Time</p>
                  <p className="text-lg font-bold text-primary">
                    {format(new Date(selectedModalExam.examination_date), 'HH:mm')}
                  </p>
                </div>
              </div>

              {/* Chief Complaint */}
              <div className="border border-primary/30 rounded-lg p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <div className="w-1 h-4 bg-primary rounded" />
                  Chief Complaint
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {selectedModalExam.chief_complaint || 'N/A'}
                </p>
              </div>

              {/* Vital Signs */}
              {(selectedModalExam.triage_temperature || selectedModalExam.triage_blood_pressure || 
                selectedModalExam.triage_pulse_rate || selectedModalExam.triage_respiratory_rate ||
                selectedModalExam.triage_oxygen_saturation || selectedModalExam.triage_weight ||
                selectedModalExam.triage_height || selectedModalExam.triage_bmi) && (
                <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <div className="w-1 h-4 bg-red-600 rounded" />
                    Vital Signs
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {selectedModalExam.triage_temperature && (
                      <div className="bg-white p-3 rounded border border-red-200">
                        <p className="text-xs font-medium text-gray-600">Temperature</p>
                        <p className="text-lg font-bold text-red-700">{selectedModalExam.triage_temperature}°C</p>
                      </div>
                    )}
                    {selectedModalExam.triage_blood_pressure && (
                      <div className="bg-white p-3 rounded border border-red-200">
                        <p className="text-xs font-medium text-gray-600">Blood Pressure</p>
                        <p className="text-lg font-bold text-red-700">{selectedModalExam.triage_blood_pressure}</p>
                      </div>
                    )}
                    {selectedModalExam.triage_pulse_rate && (
                      <div className="bg-white p-3 rounded border border-red-200">
                        <p className="text-xs font-medium text-gray-600">Pulse Rate</p>
                        <p className="text-lg font-bold text-red-700">{selectedModalExam.triage_pulse_rate} bpm</p>
                      </div>
                    )}
                    {selectedModalExam.triage_respiratory_rate && (
                      <div className="bg-white p-3 rounded border border-red-200">
                        <p className="text-xs font-medium text-gray-600">Respiratory Rate</p>
                        <p className="text-lg font-bold text-red-700">{selectedModalExam.triage_respiratory_rate} /min</p>
                      </div>
                    )}
                    {selectedModalExam.triage_oxygen_saturation && (
                      <div className="bg-white p-3 rounded border border-red-200">
                        <p className="text-xs font-medium text-gray-600">O₂ Saturation</p>
                        <p className="text-lg font-bold text-red-700">{selectedModalExam.triage_oxygen_saturation}%</p>
                      </div>
                    )}
                    {selectedModalExam.triage_weight && (
                      <div className="bg-white p-3 rounded border border-red-200">
                        <p className="text-xs font-medium text-gray-600">Weight</p>
                        <p className="text-lg font-bold text-red-700">{selectedModalExam.triage_weight} kg</p>
                      </div>
                    )}
                    {selectedModalExam.triage_height && (
                      <div className="bg-white p-3 rounded border border-red-200">
                        <p className="text-xs font-medium text-gray-600">Height</p>
                        <p className="text-lg font-bold text-red-700">{selectedModalExam.triage_height} cm</p>
                      </div>
                    )}
                    {selectedModalExam.triage_bmi && (
                      <div className="bg-white p-3 rounded border border-red-200">
                        <p className="text-xs font-medium text-gray-600">BMI</p>
                        <p className="text-lg font-bold text-red-700">{selectedModalExam.triage_bmi}</p>
                      </div>
                    )}
                  </div>
                  {selectedModalExam.triage_notes && (
                    <div className="mt-3 pt-3 border-t border-red-200">
                      <p className="text-xs font-medium text-gray-600 mb-1">Triage Notes</p>
                      <p className="text-sm text-gray-700">{selectedModalExam.triage_notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Assessment/Diagnosis */}
              {selectedModalExam.assessment_diagnosis && (
                <div className="border border-primary/30 rounded-lg p-4 bg-primary/5">
                  <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <div className="w-1 h-4 bg-primary rounded" />
                    Assessment/Diagnosis
                  </h3>
                  <p className="text-gray-700 leading-relaxed font-semibold">
                    {selectedModalExam.assessment_diagnosis}
                  </p>
                </div>
              )}

              {/* Two Column Layout for Additional Details */}
              <div className="grid grid-cols-2 gap-4">
                {selectedModalExam.history_of_present_illness && (
                  <div className="border border-primary/30 rounded-lg p-4">
                    <h3 className="text-sm font-bold text-gray-900 mb-2">History of Present Illness</h3>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {selectedModalExam.history_of_present_illness}
                    </p>
                  </div>
                )}

                {selectedModalExam.plan_treatment && (
                  <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                    <h3 className="text-sm font-bold text-gray-900 mb-2">Treatment Plan</h3>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {selectedModalExam.plan_treatment}
                    </p>
                  </div>
                )}

                {selectedModalExam.medications_prescribed && (
                  <div className="border border-amber-200 rounded-lg p-4 bg-amber-50">
                    <h3 className="text-sm font-bold text-gray-900 mb-2">Medications Prescribed</h3>
                    <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                      {selectedModalExam.medications_prescribed}
                    </p>
                  </div>
                )}

                {selectedModalExam.follow_up_date && (
                  <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                    <h3 className="text-sm font-bold text-gray-900 mb-2">Follow-up Date</h3>
                    <p className="text-lg font-semibold text-purple-900">
                      {format(new Date(selectedModalExam.follow_up_date), 'dd MMM yyyy')}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                {onSelectExamination && (
                  <Button
                    onClick={() => {
                      onSelectExamination(selectedModalExam);
                      setSelectedModalExam(null);
                    }}
                    className="flex-1 bg-primary hover:bg-primary/90 text-white"
                  >
                    Use as Reference
                  </Button>
                )}
                <Button
                  onClick={() => setSelectedModalExam(null)}
                  variant="outline"
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PatientConsultationHistory;
