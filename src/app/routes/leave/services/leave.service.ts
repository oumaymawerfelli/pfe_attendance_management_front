import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { LeaveRecord, LeaveRequest, LeaveBalance } from '../models/leave.model';

@Injectable({ providedIn: 'root' })
export class LeaveService {
  private api = `${environment.apiUrl}/leaves`;

  constructor(private http: HttpClient) {}

  // ── Employee ──────────────────────────────────────────────────────────────

  requestLeave(payload: LeaveRequest): Observable<LeaveRecord> {
    return this.http.post<LeaveRecord>(`${this.api}/request`, payload);
  }

  getMyLeaves(): Observable<LeaveRecord[]> {
    return this.http.get<LeaveRecord[]>(`${this.api}/my`);
  }

  getMyBalance(): Observable<LeaveBalance> {
    return this.http.get<LeaveBalance>(`${this.api}/my/balance`);
  }

  // ── Project Manager — team only ───────────────────────────────────────────

  getTeamAllLeaves(): Observable<LeaveRecord[]> {
    return this.http.get<LeaveRecord[]>(`${this.api}/team/all`);
  }

  getTeamPendingLeaves(): Observable<LeaveRecord[]> {
    return this.http.get<LeaveRecord[]>(`${this.api}/team/pending`);
  }

  approveTeamLeave(id: number): Observable<LeaveRecord> {
    return this.http.post<LeaveRecord>(`${this.api}/team/${id}/approve`, {});
  }

  rejectTeamLeave(id: number, rejectionReason?: string): Observable<LeaveRecord> {
    return this.http.post<LeaveRecord>(`${this.api}/team/${id}/reject`, { rejectionReason });
  }

  // ── General Manager / Admin ───────────────────────────────────────────────

  getPendingLeaves(): Observable<LeaveRecord[]> {
    return this.http.get<LeaveRecord[]>(`${this.api}/pending`);
  }

  getAllLeaves(): Observable<LeaveRecord[]> {
    return this.http.get<LeaveRecord[]>(`${this.api}/all`);
  }

  approveLeave(id: number): Observable<LeaveRecord> {
    return this.http.post<LeaveRecord>(`${this.api}/${id}/approve`, {});
  }

  rejectLeave(id: number, rejectionReason?: string): Observable<LeaveRecord> {
    return this.http.post<LeaveRecord>(`${this.api}/${id}/reject`, { rejectionReason });
  }

  // ── Document ──────────────────────────────────────────────────────────────

  /**
   * Uploads the generated PDF blob to the backend.
   * Called right after approval so the document is persisted server-side.
   */
  uploadDocument(leaveId: number, pdfBlob: Blob): Observable<void> {
    const form = new FormData();
    form.append('file', pdfBlob, `leave_${leaveId}.pdf`);
    return this.http.post<void>(`${this.api}/${leaveId}/document`, form);
  }

  /**
   * Opens the stored PDF in a new browser tab (inline view + print).
   * Uses the backend URL directly — works on any device, any browser.
   */
  openDocument(leaveId: number): void {
    const url = `${environment.apiUrl}/leaves/${leaveId}/document`;
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: blob => {
        const objectUrl = URL.createObjectURL(blob);
        const tab = window.open(objectUrl, '_blank');
        // Revoke the object URL after the tab has loaded to free memory
        if (tab) {
          tab.addEventListener('load', () => URL.revokeObjectURL(objectUrl), { once: true });
        }
      },
      error: err => console.error('Failed to open document:', err),
    });
  }
}
