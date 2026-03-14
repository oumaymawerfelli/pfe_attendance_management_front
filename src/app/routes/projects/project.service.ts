// src/app/routes/projects/project.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';

export interface Project {
  id: number;
  code: string;
  name: string;
  description: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  startDate: string;
  endDate: string;
  projectManagerName?: string;
  projectManagerEmail?: string;
  assignmentDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectResponse {
  content: Project[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
  pageable: any;
  sort: any;
}

export interface TeamMember {
  id: number;                // ID de l'employé
  assignmentId?: number;     // ID de l'assignation (optionnel)
  firstName: string;
  lastName: string;
  email: string;
  assignedDate: string;
  assigningManager: string;
  role?: string;
}

export interface TeamAssignmentRequest {
  projectId: number;
  employeeId: number;
  assigningManagerId: number;
  notes?: string;
}

export interface ProjectRequest {
  name: string;
  description: string;
  status: string;
  startDate: string;
  endDate: string;
  projectManagerId?: number;
}

export interface StatusUpdateRequest {
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private apiUrl = `${environment.apiUrl}/projects`;

  constructor(private http: HttpClient) {}

  // ==================== Project CRUD ====================

  getAll(page = 0, size = 10, sortField?: string, sortDirection?: string): Observable<ProjectResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    if (sortField && sortDirection) {
      params = params.set('sort', `${sortField},${sortDirection}`);
    }

    return this.http.get<ProjectResponse>(this.apiUrl, { params });
  }

  getById(id: number): Observable<Project> {
    return this.http.get<Project>(`${this.apiUrl}/${id}`);
  }

  getWithTeam(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}/with-team`);
  }

  create(project: ProjectRequest): Observable<Project> {
    return this.http.post<Project>(this.apiUrl, project);
  }

  update(id: number, project: ProjectRequest): Observable<Project> {
    return this.http.put<Project>(`${this.apiUrl}/${id}`, project);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // ==================== Status Management ====================

  updateStatus(id: number, status: string): Observable<Project> {
    return this.http.put<Project>(`${this.apiUrl}/${id}/status?status=${status}`, {});
  }

  // ==================== Team Management ====================

  getTeamMembers(id: number): Observable<TeamMember[]> {
  return this.http.get<any[]>(`${this.apiUrl}/${id}/team`).pipe(
    map((members: any[]) => members.map(member => ({
      id: member.employeeId,           // ← ID de l'employé
      assignmentId: member.assignmentId ?? member.id, // ← ID de l'assignation
      firstName: member.firstName ?? member.employeeFirstName,
      lastName: member.lastName ?? member.employeeLastName,
      email: member.email ?? member.employeeEmail,
      assignedDate: member.assignedDate ?? member.addedDate,
      assigningManager: member.assigningManager ?? member.assigningManagerName,
    })))
  );
}
  assignTeamMember(projectId: number, employeeId: number): Observable<any> {
    const payload = {
      projectId: projectId,
      employeeId: employeeId
    };
    return this.http.post(`${this.apiUrl}/team/assign`, payload);
  }

  removeTeamMember(assignmentId: number): Observable<void> {
  
  return this.http.delete<void>(
    `${environment.apiUrl}/team-assignments/${assignmentId}`
  );
}

  // ==================== Filter Methods ====================

  getByStatus(status: string): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.apiUrl}/status/${status}`);
  }

  getActive(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.apiUrl}/active`);
  }

  getInactive(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.apiUrl}/inactive`);
  }

  getByManager(managerId: number): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.apiUrl}/manager/${managerId}`);
  }

  getByEmployee(employeeId: number): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.apiUrl}/employee/${employeeId}`);
  }

  getByCode(code: string): Observable<Project> {
    return this.http.get<Project>(`${this.apiUrl}/code/${code}`);
  }

  search(keyword: string): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.apiUrl}/search?keyword=${keyword}`);
  }

  // ==================== Stats ====================

  countByStatus(status: string): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/count/status/${status}`);
  }
}