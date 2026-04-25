import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { Notification } from '../models/Notification.model';
import { environment } from '@env/environment';

export interface NotificationPage {
  content: Notification[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  private apiUrl = `${environment.apiUrl}/notifications`;
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  private eventSource: EventSource | null = null;
  private initialized = false;

  constructor(private http: HttpClient) {
    // ❌ DO NOT connect here
  }

  /** Call this once after the user is authenticated */
  init(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.connectSSE();
    this.refreshUnreadCount();
  }

  // ── SSE ─────────────────────────────────────────────────────

  private connectSSE(): void {
    let token: string | null = null;
    try {
      const raw = localStorage.getItem('ng-matero-token');
      if (raw) {
        token = JSON.parse(raw)?.access_token ?? null;
      }
    } catch {
      token = null;
    }

    if (!token) {
      console.error('No valid token found for SSE connection');
      return;
    }

    if (this.eventSource) {
      this.eventSource.close();
    }

    this.eventSource = new EventSource(`${this.apiUrl}/stream?token=${encodeURIComponent(token)}`);

    this.eventSource.onmessage = () => {
      const current = this.unreadCountSubject.value;
      this.unreadCountSubject.next(current + 1);
    };

    this.eventSource.onerror = () => {
      this.eventSource?.close();
      setTimeout(() => this.connectSSE(), 5000);
    };
  }

  ngOnDestroy(): void {
    this.eventSource?.close();
  }

  // ── HTTP ─────────────────────────────────────────────────────

  getNotifications(page = 0, size = 20): Observable<NotificationPage> {
    return this.http.get<NotificationPage>(`${this.apiUrl}?page=${page}&size=${size}`);
  }

  getUnreadCount(): Observable<number> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/unread-count`).pipe(
      tap(res => this.unreadCountSubject.next(res.count)),
      map(res => res.count)
    );
  }

  refreshUnreadCount(): void {
    this.getUnreadCount().subscribe();
  }

  markRead(notificationId: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${notificationId}/read`, {}).pipe(
      tap(() => {
        const current = this.unreadCountSubject.value;
        this.unreadCountSubject.next(Math.max(0, current - 1));
      })
    );
  }

  markAllRead(): Observable<void> {
    return this.http
      .patch<void>(`${this.apiUrl}/read-all`, {})
      .pipe(tap(() => this.unreadCountSubject.next(0)));
  }
}
