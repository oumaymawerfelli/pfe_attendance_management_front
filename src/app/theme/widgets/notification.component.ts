// src/app/theme/widgets/notification.component.ts
import {
  Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { NotificationService } from '../../routes/Notification/services/Notification.service';
import { Notification, NOTIFICATION_META } from '../../routes/Notification/models/Notification.model';

interface NotificationPage {
  content: Notification[];
  totalPages: number;
  number: number;
}

@Component({
  selector: 'app-notification',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- ── Bell trigger ──────────────────────────────── -->
    <button
      mat-icon-button
      class="notif-trigger"
      [matMenuTriggerFor]="notifPanel"
      (menuOpened)="onOpen()"
      matTooltip="Notifications"
      aria-label="Open notifications">
      <mat-icon
        [matBadge]="unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : null"
        matBadgeColor="warn"
        matBadgeSize="small"
        [matBadgeHidden]="unreadCount === 0">
        notifications
      </mat-icon>
    </button>

    <!-- ── Dropdown panel ────────────────────────────── -->
    <mat-menu #notifPanel="matMenu" class="notif-menu-panel" xPosition="before">
      <div class="np-wrap" (click)="$event.stopPropagation()">

        <!-- Header -->
        <div class="np-header">
          <span class="np-title">
            Notifications
            <span class="np-badge" *ngIf="unreadCount > 0">{{ unreadCount }}</span>
          </span>
          <button class="np-mark-all" *ngIf="unreadCount > 0" (click)="markAllRead()">
            Mark all read
          </button>
        </div>

        <!-- Loading -->
        <div class="np-loading" *ngIf="loading">
          <mat-spinner diameter="28"></mat-spinner>
        </div>

        <!-- List -->
        <div class="np-list" *ngIf="!loading">

          <div *ngIf="preview.length === 0" class="np-empty">
            <mat-icon>notifications_none</mat-icon>
            <span>You're all caught up!</span>
          </div>

          <div
            *ngFor="let n of preview"
            class="np-item"
            [class.np-unread]="!n.read"
            (click)="markRead(n)">

            <div class="np-icon-bubble"
                 [style.background]="getMeta(n.type).bgColor">
              <mat-icon [style.color]="getMeta(n.type).color">
                {{ getMeta(n.type).icon }}
              </mat-icon>
            </div>

            <div class="np-content">
              <div class="np-item-title">{{ n.title }}</div>
              <div class="np-item-msg">{{ n.message }}</div>
              <div class="np-item-time">{{ timeAgo(n.createdAt) }}</div>
            </div>

            <span class="np-unread-dot" *ngIf="!n.read"></span>
          </div>
        </div>

        <!-- Footer -->
        <div class="np-footer">
          <button class="np-view-all" (click)="viewAll()">
            View all notifications
            <mat-icon>arrow_forward</mat-icon>
          </button>
        </div>

      </div>
    </mat-menu>
  `,
  styles: [`
    // ── Trigger ───────────────────────────────────────
    .notif-trigger { position: relative; }

    // ── Panel wrapper (overrides mat-menu padding) ────
    ::ng-deep .notif-menu-panel .mat-mdc-menu-content {
      padding: 0 !important;
    }
    ::ng-deep .notif-menu-panel {
      border-radius: 16px !important;
      box-shadow: 0 8px 32px rgba(26,46,90,0.14) !important;
      border: 1px solid #e2e8f0 !important;
      overflow: hidden !important;
      min-width: 360px !important;
      max-width: 360px !important;
    }

    .np-wrap {
      width: 360px;
      display: flex;
      flex-direction: column;
      max-height: 520px;
    }

    // ── Header ────────────────────────────────────────
    .np-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 18px 12px;
      border-bottom: 1px solid #f1f5f9;
      flex-shrink: 0;
    }

    .np-title {
      font-size: 15px;
      font-weight: 700;
      color: #1a2e5a;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .np-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      background: #ef4444;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      border-radius: 10px;
    }

    .np-mark-all {
      font-size: 12px;
      font-weight: 600;
      color: #3b82f6;
      border: none;
      background: none;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;
      transition: background 0.15s;

      &:hover { background: #eff6ff; }
    }

    // ── Loading ───────────────────────────────────────
    .np-loading {
      display: flex;
      justify-content: center;
      padding: 32px 0;
    }

    // ── List ──────────────────────────────────────────
    .np-list {
      overflow-y: auto;
      flex: 1;
      max-height: 380px;

      &::-webkit-scrollbar { width: 3px; }
      &::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 2px; }
    }

    .np-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 40px 24px;
      color: #94a3b8;

      mat-icon {
        font-size: 36px !important;
        width: 36px !important;
        height: 36px !important;
      }

      span { font-size: 13px; }
    }

    .np-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 18px;
      cursor: pointer;
      transition: background 0.15s;
      position: relative;
      border-bottom: 1px solid #f8fafc;

      &:last-child { border-bottom: none; }
      &:hover { background: #f8fafc; }

      &.np-unread { background: #f0f7ff; &:hover { background: #dbeafe; } }
    }

    .np-icon-bubble {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 2px;

      mat-icon {
        font-size: 18px !important;
        width: 18px !important;
        height: 18px !important;
      }
    }

    .np-content {
      flex: 1;
      min-width: 0;
    }

    .np-item-title {
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .np-item-msg {
      font-size: 12px;
      color: #64748b;
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .np-item-time {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 3px;
    }

    .np-unread-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #3b82f6;
      flex-shrink: 0;
      margin-top: 6px;
    }

    // ── Footer ────────────────────────────────────────
    .np-footer {
      padding: 10px 18px;
      border-top: 1px solid #f1f5f9;
      flex-shrink: 0;
    }

    .np-view-all {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      padding: 8px;
      border: none;
      border-radius: 10px;
      background: #f8fafc;
      font-size: 13px;
      font-weight: 600;
      color: #1a2e5a;
      cursor: pointer;
      transition: background 0.15s;

      mat-icon {
        font-size: 16px !important;
        width: 16px !important;
        height: 16px !important;
        transition: transform 0.2s;
      }

      &:hover {
        background: #e2e8f0;
        mat-icon { transform: translateX(3px); }
      }
    }
  `],
})
export class NotificationComponent implements OnInit, OnDestroy {

  unreadCount = 0;
  preview:     Notification[] = [];
  loading      = false;

  private destroy$ = new Subject<void>();

  constructor(
    private notificationService: NotificationService,
    private router:  Router,
    private cdr:     ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.notificationService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => { this.unreadCount = count; this.cdr.markForCheck(); });

    this.notificationService.getUnreadCount()
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: c => { this.unreadCount = c; this.cdr.markForCheck(); } });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  // ── Load preview when panel opens ─────────────────
  onOpen(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.notificationService.getNotifications(0, 6)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page: NotificationPage) => {
          this.preview = page.content;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => { this.loading = false; this.cdr.markForCheck(); },
      });
  }

  // ── Actions ────────────────────────────────────────
  markRead(n: Notification): void {
    if (n.read) return;
    this.notificationService.markRead(n.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        n.read = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        this.cdr.markForCheck();
      });
  }

  markAllRead(): void {
    this.notificationService.markAllRead()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.preview.forEach(n => (n.read = true));
        this.unreadCount = 0;
        this.cdr.markForCheck();
      });
  }

  viewAll(): void {
    this.router.navigate(['/notifications']);
  }

  // ── Helpers ────────────────────────────────────────
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
    return new Date(dateStr).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  }

  private navigate(n: Notification): void {
    if (n.link) this.router.navigateByUrl(n.link);
  }
}