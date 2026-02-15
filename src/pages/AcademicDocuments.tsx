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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, FileCheck, Clock, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { AcademicDocument, DocumentType } from '@/types/notifications';

const documentTypes: { value: DocumentType; label: string }[] = [
  { value: 'passport_photo', label: 'Passport Photo' },
  { value: 'degree', label: 'Degree Certificate' },
  { value: 'license', label: 'Professional License' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'other', label: 'Other' },
];

const AcademicDocuments = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<DocumentType | ''>('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Fetch submitted documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['academic-documents', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('academic_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('Error fetching documents:', error);
        throw error;
      }

      return (data || []) as AcademicDocument[];
    },
    enabled: !!user?.id,
  });

  // Upload document mutation
  const uploadDocumentMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !selectedFile || !selectedType || !documentTitle) {
        throw new Error('Please fill in all required fields');
      }

      // Upload file to Supabase storage
      const fileName = `${user.id}/${Date.now()}_${selectedFile.name}`;
      const { error: uploadError, data } = await supabase.storage
        .from('academic-documents')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('academic-documents').getPublicUrl(fileName);

      // Insert document record
      const { error: dbError } = await supabase.from('academic_documents').insert([
        {
          user_id: user.id,
          document_type: selectedType,
          document_title: documentTitle,
          file_url: publicUrl,
          file_size: selectedFile.size,
          file_mime_type: selectedFile.type,
          status: 'pending',
        },
      ]);

      if (dbError) throw dbError;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-documents'] });
      toast.success('Document submitted successfully');
      setSelectedType('');
      setDocumentTitle('');
      setSelectedFile(null);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Academic Documents</h1>
          <p className="text-muted-foreground mt-1">
            Submit and manage your academic and professional documents
          </p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Upload className="h-4 w-4" />
              Submit Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Academic Document</DialogTitle>
              <DialogDescription>
                Upload your academic or professional document for admin approval
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="doc-type">Document Type *</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger id="doc-type">
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="doc-title">Document Title *</Label>
                <Input
                  id="doc-title"
                  placeholder="e.g., Bachelor of Science in Computer Science"
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="doc-file">File *</Label>
                <Input
                  id="doc-file"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
                {selectedFile && (
                  <p className="text-xs text-muted-foreground">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <Button
                onClick={() => uploadDocumentMutation.mutate()}
                disabled={uploadDocumentMutation.isPending || !selectedFile || !selectedType || !documentTitle}
                className="w-full"
              >
                {uploadDocumentMutation.isPending ? 'Uploading...' : 'Submit Document'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
              <p className="text-muted-foreground">No documents submitted yet</p>
            </CardContent>
          </Card>
        ) : (
          documents.map((doc) => (
            <Card key={doc.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{doc.document_title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Type: {documentTypes.find((t) => t.value === doc.document_type)?.label}
                    </p>
                  </div>
                  <Badge className={getStatusColor(doc.status)}>
                    {doc.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                    {doc.status === 'approved' && <FileCheck className="h-3 w-3 mr-1" />}
                    {doc.status === 'rejected' && <X className="h-3 w-3 mr-1" />}
                    {doc.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Submitted</p>
                    <p className="font-medium">
                      {formatDistanceToNow(new Date(doc.submitted_at), { addSuffix: true })}
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
                    <p className="text-xs font-medium text-muted-foreground mb-1">Admin Comments</p>
                    <p className="text-sm">{doc.admin_comments}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(doc.file_url, '_blank')}
                  >
                    View Document
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AcademicDocuments;
