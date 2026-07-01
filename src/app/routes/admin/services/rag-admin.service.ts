import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface RagIngestionLog {
  id: number;
  fileSlug: string;
  fileName?: string;
  fileHash: string;
  previousHash?: string;
  status: 'SUCCESS' | 'NO_CHANGE' | 'FAILED';
  message?: string;          // ← message (pas errorMessage)
  chunksCount: number;
  ingestedAt: string;
}

export interface RagStats {
  totalIngestions: number;
  successCount: number;
  noChangeCount: number;
  failedCount: number;
}

export interface ForceSyncResponse {
  status: string;
  message: string;
  log?: RagIngestionLog;
}

@Injectable({ providedIn: 'root' })
export class RagAdminService {
 private baseUrl = `${environment.apiUrl}/admin/rag`;

  constructor(private http: HttpClient) {}

  getAllLogs(page = 0, size = 20): Observable<RagIngestionLog[]> {
    return this.http.get<RagIngestionLog[]>(
      `${this.baseUrl}/ingestion-logs?page=${page}&size=${size}`
    );
  }

  getLastLog(): Observable<RagIngestionLog> {
    return this.http.get<RagIngestionLog>(`${this.baseUrl}/ingestion-logs/last`);
  }

  forceSync(): Observable<ForceSyncResponse> {
    return this.http.post<ForceSyncResponse>(`${this.baseUrl}/force-sync`, {});
  }

  getStats(): Observable<RagStats> {
    return this.http.get<RagStats>(`${this.baseUrl}/stats`);
  }
}