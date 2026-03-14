import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { LeaveRecord, LeaveRequest, LeaveBalance } from '../models/leave.model';

@Injectable({ providedIn: 'root' })
export class LeaveService {
  private api = `${environment.apiUrl}/leaves`;

  constructor(private http: HttpClient) {}

  requestLeave(payload: LeaveRequest): Observable<LeaveRecord> {
    return this.http.post<LeaveRecord>(`${this.api}/request`, payload);
  }

  getMyLeaves(): Observable<LeaveRecord[]> {
    return this.http.get<LeaveRecord[]>(`${this.api}/my`);
  }

  getMyBalance(): Observable<LeaveBalance> {
    return this.http.get<LeaveBalance>(`${this.api}/my/balance`);
  }
}