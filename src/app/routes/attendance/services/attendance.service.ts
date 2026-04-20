import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { AttendanceRecord, AttendanceSummary, AttendanceFilter } from '../models/attendance.model';

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private api = `${environment.apiUrl}/attendance`;

  constructor(private http: HttpClient) {}

  // ── Check-in / Check-out ──────────────────────────────────────────────────

  checkIn(): Observable<void> {
    return this.http.post<void>(`${this.api}/check-in`, {});
  }

  checkOut(notes?: string): Observable<void> {
    return this.http.post<void>(`${this.api}/logout-checkout`, { notes });
  }

  hasMissedCheckout(): Observable<boolean> {
    return this.http.get<boolean>(`${this.api}/missed-checkout`);
  }

  fixMissedCheckout(checkOutTime: string): Observable<AttendanceRecord> {
    return this.http.put<AttendanceRecord>(`${this.api}/fix-checkout`, { checkOutTime });
  }

  // ── Employee — own data ───────────────────────────────────────────────────

  getMyAttendance(filter: AttendanceFilter = {}): Observable<AttendanceRecord[]> {
    return this.http.get<AttendanceRecord[]>(`${this.api}/my`, { params: buildParams(filter) });
  }

  getMySummary(filter: AttendanceFilter = {}): Observable<AttendanceSummary> {
    return this.http.get<AttendanceSummary>(`${this.api}/my/summary`, {
      params: buildParams(filter),
    });
  }

  /**
   * Fetches the full attendance record for a single day.
   * Called when the user clicks a day cell in the calendar.
   * Returns 404 if no record exists (absent / weekend / future).
   */
  getMyDayRecord(date: string): Observable<AttendanceRecord> {
    const params = new HttpParams().set('date', date);
    return this.http.get<AttendanceRecord>(`${this.api}/my/day`, { params });
  }

  // ── Project Manager — team data ───────────────────────────────────────────

  getTeamAttendance(filter: AttendanceFilter = {}): Observable<AttendanceRecord[]> {
    return this.http.get<AttendanceRecord[]>(`${this.api}/team`, { params: buildParams(filter) });
  }

  // ── GM / Admin — full access ──────────────────────────────────────────────

  getAllAttendance(filter: AttendanceFilter = {}): Observable<AttendanceRecord[]> {
    return this.http.get<AttendanceRecord[]>(`${this.api}/all`, { params: buildParams(filter) });
  }
}

function buildParams(filter: AttendanceFilter): HttpParams {
  let params = new HttpParams();
  if (filter.month) params = params.set('month', filter.month);
  if (filter.year) params = params.set('year', filter.year);
  return params;
}
