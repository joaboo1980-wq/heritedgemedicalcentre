import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Check, X, Eye, FileCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { AcademicDocument, DocumentStatus } from '@/types/notifications';
import { usePermissions } from '@/hooks/usePermissions';

const ReviewAcademicDocuments = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all');
  const [reviewingDoc, setReviewingDoc] = useState<AcademicDocument | null>(null);
  const [reviewComments, setReviewComments] = useState('');

  // Check permissions
  if (!hasPermission('user_management', 'edit')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">You don't have permission to review documents</p>
      </div>
    );
  }

  // Fetch all submitted documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['academic-documents', statusFilter],
    queryFn: async () => {
      let query = supabase.from('academic_documents').select('*');

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query.order('submitted_at', { ascending: false });

      if (error) {
        console.error('Error fetching documents:', error);
        throw error;
      }

      return (data || []) as AcademicDocument[];
    },
  });

  // Approve document mutation
  const approveMutation = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase
        .from('academic_documents')
        .update({
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          admin_comments: reviewComments,
        })
        .eq('id', docId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-documents'] });
      toast.success('Document approved');
      setReviewingDoc(null);
      setReviewComments('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Reject document mutation
  const rejectMutation = useMutation({
    mutationFn: async (docId: string) => {
      if (!reviewComments) {
        throw new Error('Please provide rejection reason');
      }

      const { error } = await supabase
        .from('academic_documents')
        .update({
          status: 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          admin_comments: reviewComments,
        })
        .eq('id', docId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-documents'] });
      toast.success('Document rejected');
      setReviewingDoc(null);
      setReviewComments('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Academic Documents</h1>
        <p className="text-muted-foreground mt-1">Review and approve staff academic documents</p>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Documents</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Documents List */}
      <div className="grid gap-4">
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading documents...</p>
            </CardContent>
          </Card>
        ) : documents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileCheck className="h-12 w-12 text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground">No documents found</p>
            </CardContent>
          </Card>
        ) : (
          documents.map((doc) => (
            <Card key={doc.id} className={doc.status === 'pending' ? 'border-yellow-200' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{doc.document_title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      User ID: {doc.user_id.substring(0, 8)}... | Type: {doc.document_type}
                    </p>
                  </div>
                  <Badge className={getStatusColor(doc.status)}>
                    {doc.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Submitted</p>
                    <p className="font-medium">
                      {formatDistanceToNow(new Date(doc.submitted_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">File Size</p>
                    <p className="font-medium">
                      {doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(2)} MB` : 'N/A'}
                    </p>
                  </div>
                  {doc.reviewed_at && (
                    <div>
                      <p className="text-muted-foreground">Reviewed</p>
                      <p className="font-medium">
                        {formatDistanceToNow(new Date(doc.reviewed_at), { addSuffix: true })}
                      </p>
                    </div>
                  )}
                </div>

                {doc.admin_comments && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Comments</p>
                    <p className="text-sm">{doc.admin_comments}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(doc.file_url, '_blank')}
                    className="gap-1"
                  >
                    <Eye className="h-4 w-4" />
                    View Document
                  </Button>

                  {doc.status === 'pending' && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" onClick={() => setReviewingDoc(doc)}>
                          Review
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Review Document</DialogTitle>
                          <DialogDescription>
                            {doc.document_title}
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="review-comments">Comments (Optional for approval, Required for rejection)</Label>
                            <Textarea
                              id="review-comments"
                              placeholder="Add any comments or reason for rejection..."
                              value={reviewComments}
                              onChange={(e) => setReviewComments(e.target.value)}
                              className="min-h-24"
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button
                              onClick={() => approveMutation.mutate(doc.id)}
                              disabled={approveMutation.isPending}
                              className="flex-1 gap-1"
                            >
                              <Check className="h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              onClick={() => rejectMutation.mutate(doc.id)}
                              disabled={rejectMutation.isPending || !reviewComments}
                              variant="destructive"
                              className="flex-1 gap-1"
                            >
                              <X className="h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ReviewAcademicDocuments;
