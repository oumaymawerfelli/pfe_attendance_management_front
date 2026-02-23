// src/app/routes/users/user.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface UserDTO {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  roles?: string[];
  registrationPending?: boolean;
  enabled: boolean;
  active: boolean;
  accountNonLocked: boolean;
  avatar?: string;
}

// Interface complète pour les détails de l'utilisateur
export interface UserResponseDTO extends UserDTO {
  username: string;
  createdAt?: string;
  lastLogin?: string;
  
  // ✅ AJOUTER CES CHAMPS MANQUANTS
  service?: string;
  contractType?: string;
  contractEndDate?: string;
  description?: string;
  
  // ✅ AJOUTER AUSSI CES CHAMPS SI NÉCESSAIRES
  birthDate?: string;
  gender?: string;
  nationality?: string;
  maritalStatus?: string;
  address?: string;
  hireDate?: string;
}

export interface UserStats {
  pending: number;
  active: number;
  disabled: number;
  locked: number;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable()
export class UsersService {
  private apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {
    console.log('📡 UsersService initialized with API URL:', this.apiUrl);
  }

  getUsers(page: number, size: number, search: string = ''): Observable<PageResponse<UserDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    if (search) {
      params = params.set('search', search);
    }
    
    return this.http.get<PageResponse<UserDTO>>(this.apiUrl, { params });
  }

  // Récupérer un utilisateur avec toutes ses informations
  getUser(id: number): Observable<UserResponseDTO> {
    console.log('📡 getUser called for id:', id);
    return this.http.get<UserResponseDTO>(`${this.apiUrl}/${id}`);
  }

  // Mettre à jour un utilisateur
  updateUser(id: number, userData: Partial<UserResponseDTO>): Observable<UserResponseDTO> {
    console.log('📡 updateUser called for id:', id, userData);
    return this.http.put<UserResponseDTO>(`${this.apiUrl}/${id}`, userData);
  }

  getStats(): Observable<UserStats> {
    return this.http.get<UserStats>(`${this.apiUrl}/stats`);
  }

  disableUser(id: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/disable`, {});
  }

  enableUser(id: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/enable`, {});
  }

  resetPassword(id: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/reset-password`, {});
  }
  
  approveUser(id: number): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/approve-registration/${id}`, {});
  }

  rejectUser(id: number): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/reject-registration/${id}`, {});
  }
}