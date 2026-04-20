import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { NotificationService } from '../../routes/Notification/services/Notification.service';

@Component({
  selector: 'app-notification',
  template: `
    <button
      mat-icon-button
      routerLink="/notifications"
      matTooltip="Notifications"
      aria-label="Open notifications"
    >
      <mat-icon
        [matBadge]="unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : null"
        matBadgeColor="warn"
        matBadgeSize="small"
        [matBadgeHidden]="unreadCount === 0"
      >
        notifications
      </mat-icon>
    </button>
  `,
})
export class NotificationComponent implements OnInit, OnDestroy {
  unreadCount = 0;
  private destroy$ = new Subject<void>();

  constructor(
    private notificationService: NotificationService,
    private router: Router
  ) {}
  ngOnInit(): void {
    // Subscribe to live updates from SSE + HTTP
    this.notificationService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe((count: number) => (this.unreadCount = count));

    // Load initial count from backend
    this.notificationService
      .getUnreadCount()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (count: number) => (this.unreadCount = count),
        error: (err: any) => console.error('Error loading unread count:', err),
      });
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
