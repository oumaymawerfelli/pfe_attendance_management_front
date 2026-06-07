// routes/admin/models/leave-document.model.ts

export type DocumentType =
  | 'ACCEPTATION_LETTER'
  | 'JUSTIFICATION'
  | 'MEDICAL_CERTIFICATE'
  | 'PROOF'
  | 'OTHER';

export type DocumentCategory = 'GENERATED' | 'UPLOADED';

export type DocumentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';

export interface LeaveDocument {
  id: number;
  userId: number;
  userFullName: string;
  userDepartment: string;
  leaveRequestId: number;
  leaveStartDate: string;
  leaveEndDate:   string;
  documentType:     DocumentType;
  documentCategory: DocumentCategory;
  fileName:  string;
  fileSize:  number;
  mimeType:  string;
  status:     DocumentStatus;
  adminNotes: string | null;
  reviewedByFullName: string | null;
  reviewedAt:         string | null;
  generatedBySystem: boolean;
  generatedAt:  string | null;
  uploadedAt:   string | null;
}

export interface DocumentFilter {
  userFullName?:      string;
  documentType?:      DocumentType;
  documentCategory?:  DocumentCategory;
  status?:            DocumentStatus;
  uploadedFrom?:      string;
  uploadedTo?:        string;
  leaveFrom?:         string;
  leaveTo?:           string;
  page?:  number;
  size?:  number;
  sort?:  string;
  includeArchived?: boolean; 
  leaveRequestId?: number;
}

export interface Page<T> {
  content:       T[];
  totalElements: number;
  totalPages:    number;
  size:          number;
  number:        number;
}

export interface ReviewRequest {
  status:     'APPROVED' | 'REJECTED';
  adminNotes: string;
}