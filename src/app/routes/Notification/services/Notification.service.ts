import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Notification } from '../models/Notification.model';
import { map } from 'rxjs/operators';

export interface NotificationPage {
  content: Notification[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  private apiUrl = '/api/notifications';
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  private eventSource: EventSource | null = null;

  constructor(private http: HttpClient) {
    this.connectSSE();
  }

  // ── SSE ──────────────────────────────────────────────────────────────────

  private connectSSE(): void {
    // Get token for SSE auth - make sure you're using the correct key
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');

    if (!token || token === 'null' || token === 'undefined') {
      console.error('No valid token found for SSE connection');
      return;
    }

    console.log('Connecting to SSE with token length:', token.length);

    // Close existing connection if any
    if (this.eventSource) {
      this.eventSource.close();
    }

    this.eventSource = new EventSource(`${this.apiUrl}/stream?token=${encodeURIComponent(token)}`);

    this.eventSource.onmessage = event => {
      console.log('SSE message received:', event.data);
      // Any new event means a new notification arrived — bump the count
      const current = this.unreadCountSubject.value;
      this.unreadCountSubject.next(current + 1);
    };

    this.eventSource.onerror = error => {
      console.error('SSE connection error:', error);
      // Reconnect after 5s if connection drops
      this.eventSource?.close();
      setTimeout(() => this.connectSSE(), 5000);
    };

    this.eventSource.onopen = () => {
      console.log('SSE connection established');
    };
  }

  ngOnDestroy(): void {
    this.eventSource?.close();
  }

  // ── HTTP ─────────────────────────────────────────────────────────────────

  getNotifications(page = 0, size = 20): Observable<NotificationPage> {
    return this.http.get<NotificationPage>(`${this.apiUrl}?page=${page}&size=${size}`);
  }

  getUnreadCount(): Observable<number> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/unread-count`).pipe(
      tap(response => this.unreadCountSubject.next(response.count)),
      map(response => response.count)
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
