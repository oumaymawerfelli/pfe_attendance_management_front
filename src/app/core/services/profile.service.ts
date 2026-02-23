// src/app/core/services/profile.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface ProfileUpdateRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  maritalStatus?: string;
  description?: string; // This will need to be added to your backend
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  updateProfile(userId: number, data: ProfileUpdateRequest): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${userId}/profile`, data);
  }
}