import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface DeptStat {
  department: string;
  count: number;
}

export interface DashboardStats {
  totalEmployees: number;
  newHiresThisMonth: number;
  byDepartment: DeptStat[];
}

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  // ← renomme DashboardService en DashboardApiService
  private api = `${environment.apiUrl}/dashboard`;
  constructor(private http: HttpClient) {}

  getStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.api}/stats`);
  }
}
