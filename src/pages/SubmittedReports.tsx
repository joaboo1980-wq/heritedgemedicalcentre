import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Download, Eye, CheckCircle, XCircle, Clock, MoreVertical, Star } from 'lucide-react';
import { format } from 'date-fns';

const SubmittedReports = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [adminComments, setAdminComments] = useState('');
  const [performanceRating, setPerformanceRating] = useState(3);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isReviewing, setIsReviewing] = useState(false);

  // Get all submitted reports
  const { data: submittedReports, isLoading: reportsLoading } = useQuery({
    queryKey: ['admin-submitted-reports', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('submitted_reports')
        .select('*');

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data } = await query.order('submitted_at', { ascending: false });
      return data || [];
    },
  });

  // Review report mutation
  const reviewReportMutation = useMutation({
    mutationFn: async (reportData: any) => {
      if (!selectedReport?.id) throw new Error('No report selected');

      const { error } = await supabase
        .from('submitted_reports')
        .update({
          status: reportData.status,
          admin_comments: adminComments,
          performance_rating: performanceRating,
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', selectedReport.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-submitted-reports'] });
      setReviewDialog(false);
      setAdminComments('');
      setPerformanceRating(3);
      setSelectedReport(null);
      toast({
        title: 'Success',
        description: 'Report review submitted',
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

  const handleApprove = async () => {
    setIsReviewing(true);
    try {
      await reviewReportMutation.mutateAsync({ status: 'approved' });
    } finally {
      setIsReviewing(false);
    }
  };

  const handleReject = async () => {
    setIsReviewing(true);
    try {
      await reviewReportMutation.mutateAsync({ status: 'rejected' });
    } finally {
      setIsReviewing(false);
    }
  };

  const handleExportReport = (report: any) => {
    try {
      let csv = 'SUBMITTED REPORT - REVIEW DETAILS\n';
      csv += `Generated: ${new Date().toLocaleDateString()}\n\n`;
      csv += 'Report Information\n';
      csv += `Title,${report.report_title}\n`;
      csv += `Type,${report.report_type}\n`;
      csv += `Department,${report.department}\n`;
      csv += `Status,${report.status}\n`;
      csv += `Submitted,${format(new Date(report.submitted_at), 'MMM dd, yyyy HH:mm')}\n`;
      
      csv += '\nReport Summary\n';
      csv += `${report.summary}\n`;
      
      if (report.status !== 'pending') {
        csv += '\nReview Information\n';
        csv += `Reviewed,${format(new Date(report.reviewed_at), 'MMM dd, yyyy HH:mm')}\n`;
        csv += `Performance Rating,${report.performance_rating || 'N/A'}/5\n`;
        csv += `Admin Comments,${report.admin_comments || 'N/A'}\n`;
      }
      
      const element = document.createElement('a');
      element.setAttribute('href', `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`);
      element.setAttribute('download', `Report_Review_${report.id.substring(0, 8)}_${new Date().toISOString().split('T')[0]}.csv`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      
      toast({
        title: 'Success',
        description: 'Report exported successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export report',
        variant: 'destructive',
      });
    }
  };

  const handleExportAll = () => {
    if (!submittedReports || submittedReports.length === 0) {
      toast({
        title: 'No Data',
        description: 'No reports to export',
        variant: 'destructive',
      });
      return;
    }

    try {
      let csv = 'SUBMITTED REPORTS EXPORT\n';
      csv += `Generated: ${new Date().toLocaleDateString()}\n`;
      csv += `Status Filter: ${statusFilter === 'all' ? 'All Reports' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}\n\n`;
      csv += 'Report Title,Type,Department,Status,Submitted Date,Rating,Reviewed Date\n';
      
      submittedReports.forEach(report => {
        csv += `"${report.report_title}","${report.report_type}","${report.department}","${report.status}","${format(new Date(report.submitted_at), 'MMM dd, yyyy')}","${report.performance_rating || 'N/A'}","${report.reviewed_at ? format(new Date(report.reviewed_at), 'MMM dd, yyyy') : 'N/A'}"\n`;
      });
      
      const element = document.createElement('a');
      element.setAttribute('href', `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`);
      element.setAttribute('download', `All_Reports_Export_${new Date().toISOString().split('T')[0]}.csv`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      
      toast({
        title: 'Success',
        description: `${submittedReports.length} reports exported successfully`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export reports',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'reviewed':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-primary">Staff Reports Review</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and appraise submitted staff reports
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium">Filter by Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reports</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Submitted Reports</CardTitle>
            <CardDescription>
              {submittedReports?.length || 0} report(s) found
            </CardDescription>
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
            <div className="py-8 text-center text-muted-foreground">No reports found</div>
          ) : (
            <div className="space-y-4">
              {submittedReports?.map(report => (
                <div
                  key={report.id}
                  className="border rounded-lg p-4 hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{report.report_title}</h3>
                        <Badge variant={getStatusColor(report.status)}>
                          {getStatusIcon(report.status)}
                          <span className="ml-1">
                            {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                          </span>
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{report.summary}</p>
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span>Department: {report.department}</span>
                        <span>Type: {report.report_type}</span>
                        <span>Submitted: {format(new Date(report.submitted_at), 'MMM dd, yyyy HH:mm')}</span>
                        {report.reviewed_at && (
                          <span>Reviewed: {format(new Date(report.reviewed_at), 'MMM dd, yyyy')}</span>
                        )}
                        {report.performance_rating && (
                          <div className="flex items-center">
                            {Array.from({ length: report.performance_rating }).map((_, i) => (
                              <Star
                                key={i}
                                className="h-3 w-3 fill-yellow-400 text-yellow-400"
                              />
                            ))}
                            {Array.from({ length: 5 - report.performance_rating }).map((_, i) => (
                              <Star
                                key={i + report.performance_rating}
                                className="h-3 w-3 text-gray-300"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedReport(report);
                          setReviewDialog(true);
                          setAdminComments(report.admin_comments || '');
                          setPerformanceRating(report.performance_rating || 3);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleExportReport(report)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {report.admin_comments && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                      <p className="font-semibold text-blue-900 mb-1">Admin Comments:</p>
                      <p className="text-blue-800">{report.admin_comments}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Report</DialogTitle>
            <DialogDescription>
              {selectedReport?.report_title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Report Summary */}
            <div>
              <label className="text-sm font-medium">Report Summary</label>
              <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                {selectedReport?.summary}
              </div>
            </div>

            {/* Performance Rating */}
            <div>
              <label className="text-sm font-medium mb-2 block">Performance Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(rating => (
                  <button
                    key={rating}
                    onClick={() => setPerformanceRating(rating)}
                    className="p-2 transition-colors"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        rating <= performanceRating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Admin Comments */}
            <div>
              <label className="text-sm font-medium">Admin Comments</label>
              <Textarea
                placeholder="Add your review comments and recommendations..."
                value={adminComments}
                onChange={(e) => setAdminComments(e.target.value)}
                className="mt-2 min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isReviewing}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isReviewing}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {isReviewing ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubmittedReports;
