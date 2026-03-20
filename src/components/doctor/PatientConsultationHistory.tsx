import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Calendar, User, Stethoscope } from 'lucide-react';
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
                onClick={() => setExpandedId(expandedId === exam.id ? null : exam.id)}
                className="w-full px-4 py-3 flex items-start justify-between gap-3 text-left"
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
                <div className="flex-shrink-0">
                  {expandedId === exam.id ? (
                    <ChevronUp className="h-5 w-5 text-blue-600" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-blue-600" />
                  )}
                </div>
              </button>

              {/* Expanded Details */}
              {expandedId === exam.id && (
                <div className="border-t border-blue-200 px-4 py-3 bg-blue-50 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-medium text-gray-600">Date</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {format(new Date(exam.examination_date), 'dd MMM yyyy')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-600">Time</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {format(new Date(exam.examination_date), 'HH:mm')}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Chief Complaint</p>
                    <p className="text-sm bg-white p-2 rounded border border-blue-200">
                      {exam.chief_complaint || 'N/A'}
                    </p>
                  </div>

                  {exam.assessment_diagnosis && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">Assessment/Diagnosis</p>
                      <p className="text-sm bg-white p-2 rounded border border-blue-200">
                        {exam.assessment_diagnosis}
                      </p>
                    </div>
                  )}

                  {exam.history_of_present_illness && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">History of Present Illness</p>
                      <p className="text-sm bg-white p-2 rounded border border-blue-200">
                        {exam.history_of_present_illness}
                      </p>
                    </div>
                  )}

                  {exam.plan_treatment && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">Treatment Plan</p>
                      <p className="text-sm bg-white p-2 rounded border border-blue-200">
                        {exam.plan_treatment}
                      </p>
                    </div>
                  )}

                  {exam.medications_prescribed && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">Medications Prescribed</p>
                      <p className="text-sm bg-white p-2 rounded border border-blue-200">
                        {exam.medications_prescribed}
                      </p>
                    </div>
                  )}

                  {exam.follow_up_date && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">Follow-up Date</p>
                      <p className="text-sm font-semibold text-blue-900">
                        {format(new Date(exam.follow_up_date), 'dd MMM yyyy')}
                      </p>
                    </div>
                  )}

                  {onSelectExamination && (
                    <Button
                      size="sm"
                      onClick={() => onSelectExamination(exam)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Use as Reference
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PatientConsultationHistory;
