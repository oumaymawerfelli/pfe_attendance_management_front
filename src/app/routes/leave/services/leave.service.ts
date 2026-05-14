import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
  LeaveRecord,
  LeaveRequest,
  LeaveDraft,
  LeaveBalance,
  LeaveSummary,
  LeaveDocumentRequest,
} from '../models/leave.model';

@Injectable({ providedIn: 'root' })
export class LeaveService {
  private api = `${environment.apiUrl}/leaves`;

  constructor(private http: HttpClient) {}

  // ── Page initialisation ───────────────────────────────────────────────────

  /**
   * NEW — single call that powers the entire Request Leave page on load.
   * Returns balances for all leave types + the employee's approval workflow.
   * Call once in ngOnInit; no further requests needed until submission.
   *
   * GET /api/leave/summary
   */
  getSummary(): Observable<LeaveSummary> {
    return this.http.get<LeaveSummary>(`${this.api}/summary`);
  }

  // ── Employee ──────────────────────────────────────────────────────────────

  /**
   * UPDATED — now sends multipart/form-data so an optional file attachment
   * travels in the same request as the JSON payload.
   *
   * POST /api/leave/request
   * Content-Type: multipart/form-data
   *   leaveRequest  → JSON blob (application/json)
   *   attachment    → File | Blob  (optional)
   */
  requestLeave(payload: LeaveRequest, attachment?: File): Observable<LeaveRecord> {
    const form = new FormData();

    // Spring Boot @RequestPart("leaveRequest") expects a JSON blob with explicit type
    form.append(
      'leaveRequest',
      new Blob([JSON.stringify(payload)], { type: 'application/json' }),
    );

    if (attachment) {
      form.append('attachment', attachment, attachment.name);
    }

    // Do NOT set Content-Type manually — the browser must set the boundary automatically
    return this.http.post<LeaveRecord>(`${this.api}/request`, form);
  }

  /**
   * NEW — saves the current form state as a DRAFT without triggering the
   * approval workflow. User can resume later.
   *
   * POST /api/leave/draft
   */
  saveDraft(payload: LeaveDraft): Observable<LeaveRecord> {
    return this.http.post<LeaveRecord>(`${this.api}/draft`, payload);
  }

  getMyLeaves(): Observable<LeaveRecord[]> {
    return this.http.get<LeaveRecord[]>(`${this.api}/my`);
  }

  /** Still used by views that need only balance (e.g. dashboard widget). */
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

  generateDocument(leaveId: number, request: LeaveDocumentRequest): Observable<void> {
    return this.http.post<void>(`${this.api}/${leaveId}/generate-document`, request);
  }

  uploadDocument(leaveId: number, pdfBlob: Blob): Observable<void> {
    const form = new FormData();
    form.append('file', pdfBlob, `leave_${leaveId}.pdf`);
    return this.http.post<void>(`${this.api}/${leaveId}/document`, form);
  }

  openDocument(leaveId: number): void {
    const url = `${environment.apiUrl}/leaves/${leaveId}/document`;
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: blob => {
        const objectUrl = URL.createObjectURL(blob);
        const tab = window.open(objectUrl, '_blank');
        if (tab) {
          tab.addEventListener('load', () => URL.revokeObjectURL(objectUrl), { once: true });
        }
      },
      error: err => console.error('Failed to open document:', err),
    });
  }

  // ── Date calculation utility ──────────────────────────────────────────────

  /**
   * NEW — counts working days between two dates (inclusive), excluding
   * Saturdays and Sundays.
   *
   * Rules applied:
   *  • If end < start → returns 0 (invalid range, form should prevent this)
   *  • Half-day: caller passes halfDay=true → result is reduced by 0.5
   *  • Public holidays: not handled here yet — pass an exclusion set when ready
   *
   * This lives in the service (not a pipe or standalone util) so both the
   * request-form component and any future validator share one implementation.
   *
   * @example
   * // Mon 5 May → Fri 9 May  →  5
   * calculateWorkingDays('2025-05-05', '2025-05-09')
   *
   * @example
   * // Same range, half-day  →  4.5
   * calculateWorkingDays('2025-05-05', '2025-05-09', true)
   */
  calculateWorkingDays(
    startDate: any,
    endDate: any,
    halfDay = false,
    publicHolidays: Set<string> = new Set(),
  ): number {
    // Normalise to ISO strings first so new Date() always gets a plain string
    const startStr = this.toLocalISODate(startDate);
    const endStr   = this.toLocalISODate(endDate);

    const start = new Date(startStr);
    const end   = new Date(endStr);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return 0;
    }

    let count = 0;
    const cursor = new Date(start);

    while (cursor <= end) {
      const day = cursor.getDay();
      const iso = cursor.toISOString().split('T')[0];

      if (day !== 0 && day !== 6 && !publicHolidays.has(iso)) {
        count++;
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    return halfDay ? count - 0.5 : count;
  }

  /**
   * Converts whatever the Material datepicker returns into a local 'YYYY-MM-DD' string.
   *
   * The datepicker value type depends on which DateAdapter is registered:
   *   - NativeDateAdapter  → native Date object
   *   - MomentDateAdapter  → Moment instance  (has .format())
   *   - LuxonDateAdapter   → DateTime instance (has .toFormat())
   *
   * Accepting `any` here is intentional — the adapter type is an app-level
   * concern and we want one safe utility that works regardless.
   */
  toLocalISODate(date: any): string {
    if (!date) return '';

    // Already an ISO string
    if (typeof date === 'string') return date.split('T')[0];

    // Native Date
    if (date instanceof Date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    // Moment.js object (.format is the standard Moment API)
    if (typeof date.format === 'function') {
      return date.format('YYYY-MM-DD');
    }

    // Luxon DateTime (.toFormat is the Luxon API)
    if (typeof date.toFormat === 'function') {
      return date.toFormat('yyyy-MM-dd');
    }

    // Last resort — let JS parse it and convert to local date
    const fallback = new Date(date);
    if (!isNaN(fallback.getTime())) {
      const y = fallback.getFullYear();
      const m = String(fallback.getMonth() + 1).padStart(2, '0');
      const d = String(fallback.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    return '';
  }
}