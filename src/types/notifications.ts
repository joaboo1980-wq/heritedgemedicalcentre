export type DocumentType = 'passport_photo' | 'degree' | 'license' | 'certificate' | 'other';

export type DocumentStatus = 'pending' | 'approved' | 'rejected';

export interface AcademicDocument {
  id: string;
  user_id: string;
  document_type: DocumentType;
  document_title: string;
  file_url: string;
  file_size: number;
  file_mime_type: string;
  status: DocumentStatus;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_comments: string | null;
  created_at: string;
  updated_at: string;
}
