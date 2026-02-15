import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Download, FileText, CheckCircle, Clock, Send } from 'lucide-react';
import { format } from 'date-fns';

const GenerateReport = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [reportSummary, setReportSummary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get user's department/profile
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, department')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Get user's submitted reports
  const { data: submittedReports, isLoading: reportsLoading } = useQuery({
    queryKey: ['submitted-reports', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('submitted_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Submit report mutation
  const submitReportMutation = useMutation({
    mutationFn: async (reportData: any) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('submitted_reports')
        .insert({
          user_id: user.id,
          department: userProfile?.department || 'General',
          report_type: selectedReport,
          report_title: `${selectedReport} Report - ${format(new Date(), 'MMM dd, yyyy')}`,
          report_data: reportData,
          summary: reportSummary,
          status: 'pending',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submitted-reports'] });
      setReportSummary('');
      setSelectedReport(null);
      toast({
        title: 'Success',
        description: 'Report submitted for review',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmitReport = useCallback(async () => {
    if (!selectedReport || !reportSummary.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please select a report type and add a summary',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await submitReportMutation.mutateAsync({
        generatedAt: new Date().toISOString(),
        department: userProfile?.department || 'General',
        submittedBy: userProfile?.full_name || 'Unknown',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedReport, reportSummary, userProfile, toast, submitReportMutation]);

  const handleExportReport = useCallback((report: any) => {
    try {
      let csv = 'SUBMITTED REPORT DETAILS\n';
      csv += `Generated: ${new Date().toLocaleDateString()}\n\n`;
      csv += 'Report Information\n';
      csv += `Title,${report.report_title}\n`;
      csv += `Type,${report.report_type}\n`;
      csv += `Department,${report.department}\n`;
      csv += `Submitted,${format(new Date(report.submitted_at), 'MMM dd, yyyy')}\n`;
      csv += `Status,${report.status}\n`;
      
      csv += '\nReport Summary\n';
      csv += `${report.summary}\n`;
      
      if (report.performance_rating) {
        csv += '\nReview Information\n';
        csv += `Performance Rating,${report.performance_rating}/5\n`;
        csv += `Reviewed,${format(new Date(report.reviewed_at), 'MMM dd, yyyy')}\n`;
        csv += `Admin Comments,${report.admin_comments || 'N/A'}\n`;
      }
      
      const element = document.createElement('a');
      element.setAttribute('href', `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`);
      element.setAttribute('download', `Report_${report.id.substring(0, 8)}_${new Date().toISOString().split('T')[0]}.csv`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      
      toast({
        title: 'Success',
        description: 'Report downloaded successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export report',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const handleExportAll = useCallback(() => {
    if (!submittedReports || submittedReports.length === 0) {
      toast({
        title: 'No Data',
        description: 'No submitted reports to export',
        variant: 'destructive',
      });
      return;
    }

    try {
      let csv = 'SUBMITTED REPORTS SUMMARY\n';
      csv += `Generated: ${new Date().toLocaleDateString()}\n`;
      csv += `Department: ${userProfile?.department || 'All'}\n\n`;
      csv += 'Report Title,Type,Status,Submitted Date,Rating,Comments\n';
      
      submittedReports.forEach(report => {
        csv += `"${report.report_title}","${report.report_type}","${report.status}","${format(new Date(report.submitted_at), 'MMM dd, yyyy')}","${report.performance_rating || 'N/A'}","${(report.admin_comments || 'N/A').replace(/"/g, '""')}"\n`;
      });
      
      const element = document.createElement('a');
      element.setAttribute('href', `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`);
      element.setAttribute('download', `All_Submitted_Reports_${new Date().toISOString().split('T')[0]}.csv`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      
      toast({
        title: 'Success',
        description: 'All reports exported successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export reports',
        variant: 'destructive',
      });
    }
  }, [submittedReports, userProfile, toast]);

  const reportTypes = [
    { id: 'patient-flow', label: 'Patient Flow Report', description: 'Monthly patient flow analysis' },
    { id: 'service-utilization', label: 'Service Utilization', description: 'Healthcare service metrics' },
    { id: 'clinical-indicators', label: 'Clinical Indicators', description: 'Clinical performance metrics' },
    { id: 'staff-utilization', label: 'Staff Utilization', description: 'Staff availability and usage' },
    { id: 'disease-frequency', label: 'Disease Frequency', description: 'Most common diagnoses' },
    { id: 'department-report', label: 'Department Report', description: 'Department-specific analytics' },
    { id: 'nursing-report', label: 'Nursing Task Report', description: 'Nursing task completion and metrics' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-primary">Generate Department Report</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {userProfile?.department && `Department: ${userProfile.department}`}
        </p>
      </div>

      {/* Report Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Report Type</CardTitle>
          <CardDescription>Choose a report to generate and submit for appraisal</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reportTypes.map(report => (
              <div
                key={report.id}
                onClick={() => setSelectedReport(report.id)}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  selectedReport === report.id
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-primary/50'
                }`}
              >
                <h3 className="font-semibold">{report.label}</h3>
                <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Report Summary */}
      {selectedReport && (
        <Card>
          <CardHeader>
            <CardTitle>Report Summary</CardTitle>
            <CardDescription>Add notes or context for this report</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Enter a brief summary of the report findings, key observations, and recommendations..."
              value={reportSummary}
              onChange={(e) => setReportSummary(e.target.value)}
              className="min-h-[120px]"
            />
            <Button
              onClick={handleSubmitReport}
              disabled={isSubmitting || !reportSummary.trim()}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Submitting...' : 'Submit Report for Review'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Submitted Reports */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Your Submitted Reports</CardTitle>
            <CardDescription>Track the status of reports submitted for appraisal</CardDescription>
          </div>
          {submittedReports && submittedReports.length > 0 && (
            <Button onClick={handleExportAll} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export All
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {reportsLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading reports...</div>
          ) : submittedReports?.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No reports submitted yet</div>
          ) : (
            <div className="space-y-4">
              {submittedReports?.map(report => (
                <div
                  key={report.id}
                  className="border rounded-lg p-4 flex items-start justify-between hover:bg-accent transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold">{report.report_title}</h3>
                      <Badge
                        variant={
                          report.status === 'approved'
                            ? 'default'
                            : report.status === 'pending'
                              ? 'secondary'
                              : 'destructive'
                        }
                      >
                        {report.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                        {report.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{report.summary}</p>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>Submitted: {format(new Date(report.submitted_at), 'MMM dd, yyyy')}</span>
                      {report.reviewed_at && (
                        <span>Reviewed: {format(new Date(report.reviewed_at), 'MMM dd, yyyy')}</span>
                      )}
                      {report.performance_rating && (
                        <span>Rating: {report.performance_rating}/5 ⭐</span>
                      )}
                    </div>
                    {report.admin_comments && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                        <p className="font-semibold text-blue-900">Admin Comments:</p>
                        <p className="text-blue-800">{report.admin_comments}</p>
                      </div>
                    )}
                  </div>
                  <Button variant="outline" size="sm" className="ml-4" onClick={() => handleExportReport(report)}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GenerateReport;
