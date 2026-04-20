import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { NotificationService } from '../../services/Notification.service';
import { Notification, NOTIFICATION_META } from '../../models/Notification.model';

interface NotificationPage {
  content: Notification[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

@Component({
  selector: 'app-notifications-page',
  templateUrl: './notifications-page.component.html',
  styleUrls: ['./notifications-page.component.scss'],
})
export class NotificationsPageComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  loading = true;
  hasMore = false;
  currentPage = 0;
  readonly pageSize = 20;
  private destroy$ = new Subject<void>();

  constructor(
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.load(0);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(page: number): void {
    this.loading = true;
    this.notificationService
      .getNotifications(page, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: NotificationPage) => {
          if (page === 0) {
            this.notifications = data.content;
          } else {
            this.notifications = [...this.notifications, ...data.content];
          }
          this.currentPage = data.number;
          this.hasMore = data.number + 1 < data.totalPages;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  loadMore(): void {
    this.load(this.currentPage + 1);
  }

  markRead(notification: Notification): void {
    if (notification.read) {
      this.navigate(notification);
      return;
    }
    this.notificationService
      .markRead(notification.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        notification.read = true;
        this.navigate(notification);
      });
  }

  markAllRead(): void {
    this.notificationService
      .markAllRead()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.notifications.forEach(n => (n.read = true));
      });
  }

  getMeta(type: string) {
    return NOTIFICATION_META[type] ?? { icon: 'info', color: '#64748b' };
  }

  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    const days = Math.floor(hrs / 24);
    if (days < 7) return days + 'd ago';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private navigate(n: Notification): void {
    if (n.link) this.router.navigateByUrl(n.link);
  }
}
