// routes/admin/services/document.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  DocumentFilter,
  LeaveDocument,
  Page,
  ReviewRequest,
} from '../models/leave-document.model';

@Injectable({ providedIn: 'root' })
export class DocumentService {

  private readonly adminBase    = '/api/admin/documents';
  private readonly employeeBase = '/api/me/documents';

  constructor(private http: HttpClient) {}

  // ══════════════════════════════════════════════════════════
  // ADMIN endpoints
  // ══════════════════════════════════════════════════════════

  getAll(filter: DocumentFilter): Observable<Page<LeaveDocument>> {
    return this.http.get<Page<LeaveDocument>>(this.adminBase, {
      params: this.toParams(filter),
    });
  }

  download(id: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.adminBase}/${id}/download`, {
      responseType: 'blob',
      observe: 'response',
    });
  }

  review(id: number, body: ReviewRequest): Observable<LeaveDocument> {
    return this.http.patch<LeaveDocument>(`${this.adminBase}/${id}/review`, body);
  }

  archive(id: number): Observable<void> {
    return this.http.patch<void>(`${this.adminBase}/${id}/archive`, {});
  }

  exportZip(filter: DocumentFilter): Observable<Blob> {
    return this.http.post(`${this.adminBase}/export/zip`, filter, {
      responseType: 'blob',
    });
  }

  exportExcel(filter: DocumentFilter): Observable<Blob> {
    return this.http.post(`${this.adminBase}/export/excel`, filter, {
      responseType: 'blob',
    });
  }

  // ══════════════════════════════════════════════════════════
  // EMPLOYEE endpoints  (/api/me/documents)
  // ══════════════════════════════════════════════════════════

  /** GET /api/me/documents — own documents, paginated + filtered */
  getMyDocuments(filter: DocumentFilter): Observable<Page<LeaveDocument>> {
    return this.http.get<Page<LeaveDocument>>(this.employeeBase, {
      params: this.toParams(filter),
    });
  }

  /** GET /api/me/documents/{id}/download — stream own file */
  downloadMyDocument(id: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.employeeBase}/${id}/download`, {
      responseType: 'blob',
      observe: 'response',
    });
  }

  /** POST /api/me/documents/upload — upload supporting doc */
  uploadMyDocument(
    leaveRequestId: number,
    type: string,
    file: File
  ): Observable<LeaveDocument> {
    const form = new FormData();
    form.append('file', file);
    form.append('leaveRequestId', leaveRequestId.toString());
    form.append('type', type);
    return this.http.post<LeaveDocument>(`${this.employeeBase}/upload`, form);
  }

  // ══════════════════════════════════════════════════════════
  // Shared helpers
  // ══════════════════════════════════════════════════════════

  triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  getFilename(response: HttpResponse<Blob>, fallback: string): string {
    const cd    = response.headers.get('Content-Disposition') ?? '';
    const match = cd.match(/filename="?([^"]+)"?/);
    return match ? match[1] : fallback;
  }

private toParams(filter: DocumentFilter): HttpParams {
  let params = new HttpParams();
  Object.entries(filter).forEach(([key, val]) => {
    if (val !== null && val !== undefined && val !== '') {
      params = params.set(key, String(val));
    }
  });
  // Always send includeArchived explicitly
  if (filter.includeArchived !== undefined) {
    params = params.set('includeArchived', String(filter.includeArchived));
  }
  return params;
}
}