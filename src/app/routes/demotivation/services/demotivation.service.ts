import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DemotivationScore } from '../models/demotivation.model';

@Injectable({ providedIn: 'root' })
export class DemotivationService {

 private readonly apiUrl = '/api/demotivation';

  constructor(private http: HttpClient) {}

  getAllScores(month: number, year: number): Observable<DemotivationScore[]> {
    const params = new HttpParams()
      .set('month', month.toString())
      .set('year', year.toString());
    return this.http.get<DemotivationScore[]>(`${this.apiUrl}/scores`, { params });
  }
}