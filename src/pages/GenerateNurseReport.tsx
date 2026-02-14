import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNursingTasksForNurse, useNurseReports, useCreateNurseReport, useDeleteNurseReport } from '@/hooks/useNursingAssignments';
import type { NursingTask } from '@/types/nursing';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Download,
  Send,
  Trash2,
  Plus,
  Calendar,
  Package,
  AlertCircle,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

const GenerateNurseReport = () => {
  const { user, profile } = useAuth();
  const [reportTitle, setReportTitle] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportType, setReportType] = useState<'summary' | 'detailed' | 'custom'>('summary');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSubmitForm, setShowSubmitForm] = useState(false);

  // Fetch data
  const { data: allTasks = [] } = useNursingTasksForNurse(user?.id);
  const { data: submittedReports = [] } = useNurseReports(user?.id);
  const createReportMutation = useCreateNurseReport();
  const deleteReportMutation = useDeleteNurseReport();

  // Filter tasks by date range if specified
  const filteredTasks = useMemo(() => {
    if (!dateFrom && !dateTo) return allTasks;

    return allTasks.filter((task: NursingTask) => {
      const taskDate = task.completed_at || task.created_at;
      if (!taskDate) return false;
      const date = new Date(taskDate);

      if (dateFrom && date < new Date(dateFrom)) return false;
      if (dateTo && date > new Date(dateTo + 'T23:59:59')) return false;

      return true;
    });
  }, [allTasks, dateFrom, dateTo]);

  // Calculate statistics
  const stats = useMemo(() => {
    const completed = filteredTasks.filter((t: NursingTask) => t.status === 'completed').length;
    const pending = filteredTasks.filter((t: NursingTask) => t.status === 'pending').length;
    const inProgress = filteredTasks.filter((t: NursingTask) => t.status === 'in_progress').length;
    const total = filteredTasks.length;

    return {
      total,
      completed,
      pending,
      inProgress,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [filteredTasks]);

  const generateAndSubmitReport = async () => {
    if (!reportTitle.trim()) {
      toast.error('Please enter a report title');
      return;
    }

    setIsGenerating(true);
    try {
      const reportData = {
        title: reportTitle,
        description: reportDescription || '',
        report_type: reportType,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        task_count: stats.total,
        completed_count: stats.completed,
        pending_count: stats.pending,
        completion_rate: stats.completionRate,
        report_data: {
          tasks: filteredTasks,
          stats,
          dateRange: dateFrom || dateTo ? { from: dateFrom, to: dateTo } : undefined,
          generatedAt: new Date().toISOString(),
          generatedBy: profile?.full_name || 'Unknown Nurse',
        },
        status: 'submitted' as const,
      };

      console.log('[GenerateNurseReport] Submitting report:', reportData);

      await createReportMutation.mutateAsync(reportData as unknown as Parameters<typeof createReportMutation.mutateAsync>[0]);

      // Reset form
      setReportTitle('');
      setReportDescription('');
      setReportType('summary');
      setDateFrom('');
      setDateTo('');
      setShowSubmitForm(false);
    } catch (err) {
      console.error('[GenerateNurseReport] Error submitting report:', err);
      toast.error('Failed to submit report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      // Header
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('Heritage Medical Centre', pageWidth / 2, yPosition, { align: 'center' });

      yPosition += 10;
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Nursing Task Report', pageWidth / 2, yPosition, { align: 'center' });

      yPosition += 15;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');

      // Report details
      const details = [
        [`Nurse: ${profile?.full_name || 'Unknown'}`, `Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`],
        [`Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`, `Title: ${reportTitle}`],
        ...(dateFrom || dateTo
          ? [
              [
                `Period: ${dateFrom ? format(new Date(dateFrom), 'MMM dd, yyyy') : 'N/A'} to ${dateTo ? format(new Date(dateTo), 'MMM dd, yyyy') : 'N/A'}`,
                '',
              ],
            ]
          : []),
      ];

      details.forEach((row) => {
        doc.text(row[0], 20, yPosition);
        if (row[1]) doc.text(row[1], pageWidth / 2, yPosition);
        yPosition += 8;
      });

      yPosition += 10;

      // Statistics section
      doc.setFont(undefined, 'bold');
      doc.text('Summary Statistics', 20, yPosition);
      yPosition += 10;

      const statsTable = [
        ['Metric', 'Count'],
        ['Total Tasks', stats.total.toString()],
        ['Completed', stats.completed.toString()],
        ['Pending', stats.pending.toString()],
        ['In Progress', stats.inProgress.toString()],
        ['Completion Rate', `${stats.completionRate}%`],
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [statsTable[0]],
        body: statsTable.slice(1),
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9 },
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      yPosition = (doc as any).lastAutoTable.finalY + 15;

      // Tasks section (if detailed)
      if (reportType === 'detailed' && filteredTasks.length > 0) {
        if (yPosition + 50 > pageHeight) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFont(undefined, 'bold');
        doc.text('Task Details', 20, yPosition);
        yPosition += 10;

        const tasksTable = [
          ['Task', 'Status', 'Priority', 'Date'],
          ...filteredTasks.map((task: NursingTask) => [
            task.title || 'N/A',
            task.status?.charAt(0).toUpperCase() + task.status?.slice(1) || 'N/A',
            task.priority?.charAt(0).toUpperCase() + task.priority?.slice(1) || 'N/A',
            task.completed_at ? format(parseISO(task.completed_at), 'MMM dd') : format(parseISO(task.created_at), 'MMM dd'),
          ]),
        ];

        autoTable(doc, {
          startY: yPosition,
          head: [tasksTable[0]],
          body: tasksTable.slice(1),
          margin: { left: 20, right: 20 },
          styles: { fontSize: 8 },
          headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        });
      }

      // Footer
      const footerY = pageHeight - 10;
      doc.setFontSize(8);
      doc.text(`Generated on ${format(new Date(), 'MMM dd, yyyy HH:mm:ss')}`, 20, footerY);
      doc.text(`Page 1 of 1`, pageWidth - 30, footerY);

      // Save
      const filename = `${reportTitle || 'nursing-report'}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      doc.save(filename);
      toast.success('Report exported successfully');
    } catch (err) {
      console.error('[GenerateNurseReport] Error generating PDF:', err);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

  const getReportStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'reviewed':
        return 'bg-green-100 text-green-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Generate Report</h1>
        <p className="text-gray-600 mt-2">Create and submit custom nursing task reports</p>
      </div>

      {/* Report Preview Section */}
      {!showSubmitForm ? (
        <Card className="border border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle>Report Preview</CardTitle>
            <CardDescription>Customize your report before submission</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-gray-700">Report Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
              <Select value={reportType} onValueChange={(value: 'summary' | 'detailed' | 'custom') => setReportType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="summary">Summary (Statistics Only)</SelectItem>
                    <SelectItem value="detailed">Detailed (Statistics + Task List)</SelectItem>
                    <SelectItem value="custom">Custom (Your Selection)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 font-medium">Total Tasks</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stats.total}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 font-medium">Completed</p>
                <p className="text-2xl font-bold text-green-600 mt-2">{stats.completed}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 font-medium">Pending</p>
                <p className="text-2xl font-bold text-red-600 mt-2">{stats.pending}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 font-medium">Completion Rate</p>
                <p className="text-2xl font-bold text-blue-600 mt-2">{stats.completionRate}%</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end">
              <Button
                onClick={generatePDF}
                variant="outline"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export as PDF
              </Button>
              <Button
                onClick={() => setShowSubmitForm(true)}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Send className="h-4 w-4" />
                Submit Report
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Report Submission Form */
        <Card className="border border-blue-200">
          <CardHeader>
            <CardTitle>Submit Report</CardTitle>
            <CardDescription>Fill in the details and submit your report</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Report Title *</label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="e.g., Weekly Task Summary, March 2026"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Add any additional notes or context..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={4}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => setShowSubmitForm(false)}
                variant="outline"
              >
                Back
              </Button>
              <Button
                onClick={generateAndSubmitReport}
                disabled={isGenerating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isGenerating ? 'Submitting...' : 'Submit Report'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submitted Reports Section */}
      <Card>
        <CardHeader>
          <CardTitle>Submitted Reports</CardTitle>
          <CardDescription>
            Your submitted reports that are under admin review
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {submittedReports.length > 0 ? (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              submittedReports.map((report: any) => (
                <div
                  key={report.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 flex items-start justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <h4 className="font-semibold text-gray-900">{report.title}</h4>
                      <Badge className={getReportStatusColor(report.status)}>
                        {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{report.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {report.task_count} tasks
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(report.created_at), 'MMM dd, yyyy')}
                      </span>
                      <span>
                        Completion: <strong>{report.completion_rate}%</strong>
                      </span>
                    </div>
                    {report.review_notes && (
                      <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                        <strong>Admin Review:</strong> {report.review_notes}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={() => deleteReportMutation.mutate(report.id)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-800 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No reports submitted yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GenerateNurseReport;
