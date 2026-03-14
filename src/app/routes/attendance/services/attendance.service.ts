import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { AttendanceRecord, AttendanceSummary, AttendanceFilter } from '../models/attendance.model';

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private api = `${environment.apiUrl}/attendance`;

  constructor(private http: HttpClient) {}

  checkOut(): Observable<AttendanceRecord> {
    return this.http.post<AttendanceRecord>(`${this.api}/check-out`, {});
  }

  getMyAttendance(filter: AttendanceFilter = {}): Observable<AttendanceRecord[]> {
    let params = new HttpParams();
    if (filter.month) params = params.set('month', filter.month);
    if (filter.year)  params = params.set('year', filter.year);
    return this.http.get<AttendanceRecord[]>(`${this.api}/my`, { params });
  }

  getMySummary(filter: AttendanceFilter = {}): Observable<AttendanceSummary> {
    let params = new HttpParams();
    if (filter.month) params = params.set('month', filter.month);
    if (filter.year)  params = params.set('year', filter.year);
    return this.http.get<AttendanceSummary>(`${this.api}/my/summary`, { params });
  }
}