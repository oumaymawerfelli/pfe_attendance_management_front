// notifications-page.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { NotificationService } from '../../services/Notification.service';
import { Notification, NOTIFICATION_META } from '../../models/Notification.model';

interface NotificationPage {
  content: Notification[];
  totalPages: number;
  totalElements: number;
  number: number;
}

interface NotifGroup {
  label: string;
  items: Notification[];
}

@Component({
  selector: 'app-notifications-page',
  templateUrl: './notifications-page.component.html',
  styleUrls: ['./notifications-page.component.scss'],
})
export class NotificationsPageComponent implements OnInit, OnDestroy {

  notifications: Notification[] = [];
  filter:        'all' | 'unread' = 'all';
  loading    = true;
  hasMore    = false;
  currentPage = 0;
  readonly pageSize = 20;

  private destroy$ = new Subject<void>();

  constructor(
    private notificationService: NotificationService,
    private router: Router,
  ) {}

  ngOnInit(): void { this.load(0); }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  // ── Computed ──────────────────────────────────────────
  get unreadTotal(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  get displayed(): Notification[] {
    return this.filter === 'unread'
      ? this.notifications.filter(n => !n.read)
      : this.notifications;
  }

  get grouped(): NotifGroup[] {
    const today     = new Date(); today.setHours(0,0,0,0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const weekAgo   = new Date(today); weekAgo.setDate(today.getDate() - 7);

    const groups: Record<string, Notification[]> = {
      'Today': [], 'Yesterday': [], 'This week': [], 'Older': [],
    };

    for (const n of this.displayed) {
      const d = new Date(n.createdAt); d.setHours(0,0,0,0);
      if (d >= today)          groups.Today.push(n);
      else if (d >= yesterday) groups.Yesterday.push(n);
      else if (d >= weekAgo)   groups['This week'].push(n);
      else                     groups.Older.push(n);
    }

    return Object.entries(groups)
      .filter(([, items]) => items.length > 0)
      .map(([label, items]) => ({ label, items }));
  }

  // ── Filter tabs ───────────────────────────────────────
  setFilter(f: 'all' | 'unread'): void { this.filter = f; }

  // ── Data loading ──────────────────────────────────────
  load(page: number): void {
    this.loading = true;
    this.notificationService
      .getNotifications(page, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: NotificationPage) => {
          this.notifications = page === 0
            ? data.content
            : [...this.notifications, ...data.content];
          this.currentPage = data.number;
          this.hasMore     = data.number + 1 < data.totalPages;
          this.loading     = false;
        },
        error: () => { this.loading = false; },
      });
  }

  loadMore(): void { this.load(this.currentPage + 1); }

  // ── Actions ───────────────────────────────────────────
  markRead(n: Notification): void {
    if (n.read) return;
    this.notificationService.markRead(n.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => { n.read = true; });
  }

  markAllRead(): void {
    this.notificationService.markAllRead()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.notifications.forEach(n => (n.read = true)));
  }

  // ── Helpers ───────────────────────────────────────────
  getMeta(type: string): { icon: string; color: string; bgColor: string } {
    return NOTIFICATION_META[type] ?? { icon: 'info', color: '#64748b', bgColor: '#f1f5f9' };
  }

  timeAgo(dateStr: string): string {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60_000);
    if (mins < 1)  return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7)  return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  private navigate(n: Notification): void {
    if (n.link) this.router.navigateByUrl(n.link);
  }
}