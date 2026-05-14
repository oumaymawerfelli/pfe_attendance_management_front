import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';

import { LeaveService } from '../../services/leave.service';
import { AuthService } from '@core/authentication/auth.service';
import { hasAnyRole, hasRole } from '@core/authentication/auth.guard';
import {
  LeaveRecord,
  LeaveStatus,
  LeaveType,
  LEAVE_STATUS_CONFIG,
  LEAVE_TYPE_OPTIONS,
} from '../../models/leave.model';
import {
  LeaveDetailDialogComponent,
  LeaveDetailDialogResult,
} from '../leave-detail-dialog/leave-detail-dialog.component';

@Component({
  selector: 'app-admin-leaves',
  templateUrl: './admin-leaves.component.html',
  styleUrls: ['./admin-leaves.component.scss'],
})
export class AdminLeavesComponent implements OnInit, OnDestroy {

  @ViewChild(MatPaginator, { static: false }) paginator!: MatPaginator;
  @ViewChild(MatSort,      { static: false }) sort!: MatSort;

  readonly displayedColumns = [
    'employee', 'department', 'type', 'dates', 'days', 'status', 'actions',
  ];

  dataSource = new MatTableDataSource<LeaveRecord>();
  loading    = true;

  activeFilter: 'PENDING' | 'ALL' = 'ALL';
  searchText = '';

  isPM      = false;
  isGMAdmin = false;
  pageTitle    = 'My Leaves';
  pageSubtitle = 'View and track all your leave requests';

  // Pagination state — tracked so we can render "Showing X to Y of Z"
  pageSize  = 10;
  pageIndex = 0;
  readonly pageSizeOptions = [10, 25, 50];

  // Expose to template
  readonly LeaveStatus      = LeaveStatus;
  readonly statusConfig     = LEAVE_STATUS_CONFIG;
  readonly leaveTypeOptions = LEAVE_TYPE_OPTIONS;

  private readonly PENDING_STATUSES = new Set<LeaveStatus>([
    LeaveStatus.PENDING,
    LeaveStatus.PENDING_TEAM_LEAD,
    LeaveStatus.PENDING_HR,
    LeaveStatus.PENDING_GM,
  ]);

  private destroy$ = new Subject<void>();

  constructor(
    private leaveService: LeaveService,
    private authService:  AuthService,
    private dialog:       MatDialog,
    private snackBar:     MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.setupFilter();
    this.authService.user()
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.isPM      = hasRole(user, 'PROJECT_MANAGER');
        this.isGMAdmin = hasAnyRole(user, 'GENERAL_MANAGER', 'ADMIN');
        this.pageTitle    = this.isPM ? 'Team Leave Requests' : 'My Leaves';
        this.pageSubtitle = this.isPM
          ? 'Manage leave requests for your team members'
          : 'View and track all your leave requests';
        this.load();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Data ──────────────────────────────────────────────────────────────────

  load(): void {
    this.loading = true;

    const request$ = this.isPM
      ? (this.activeFilter === 'PENDING'
          ? this.leaveService.getTeamPendingLeaves()
          : this.leaveService.getTeamAllLeaves())
      : (this.activeFilter === 'PENDING'
          ? this.leaveService.getPendingLeaves()
          : this.leaveService.getAllLeaves());

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: data => {
        this.dataSource.data = data;
        this.pageIndex = 0;
        setTimeout(() => {
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort      = this.sort;
        });
        this.loading = false;
        this.applySearch();
      },
      error: () => { this.loading = false; },
    });
  }

  setFilter(value: 'PENDING' | 'ALL'): void {
    this.activeFilter = value;
    this.searchText   = '';
    this.dataSource.filter = '';
    this.load();
  }

  // ── Search ────────────────────────────────────────────────────────────────

  private setupFilter(): void {
    this.dataSource.filterPredicate = (row: LeaveRecord, raw: string) => {
      const q = raw.toLowerCase();
      return (
        row.userFullName.toLowerCase().includes(q)   ||
        row.userDepartment.toLowerCase().includes(q) ||
        row.leaveType.toLowerCase().includes(q)      ||
        row.status.toLowerCase().includes(q)
      );
    };
  }

  applySearch(): void {
    this.dataSource.filter = this.searchText.toLowerCase().trim();
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  clearSearch(): void { this.searchText = ''; this.applySearch(); }

  get hasSearch(): boolean { return this.searchText.length > 0; }

  // ── Pagination helpers ────────────────────────────────────────────────────

  onPage(event: PageEvent): void {
    this.pageSize  = event.pageSize;
    this.pageIndex = event.pageIndex;
  }

  get totalFiltered(): number { return this.dataSource.filteredData.length; }
  get showingFrom(): number {
    return this.totalFiltered === 0 ? 0 : this.pageIndex * this.pageSize + 1;
  }
  get showingTo(): number {
    return Math.min((this.pageIndex + 1) * this.pageSize, this.totalFiltered);
  }

  /** Page numbers to display in the pagination strip (up to 5 around current). */
  get pageNumbers(): number[] {
    const total = Math.ceil(this.totalFiltered / this.pageSize);
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    const cur  = this.pageIndex + 1;
    const start = Math.max(1, Math.min(cur - 2, total - 4));
    return Array.from({ length: 5 }, (_, i) => start + i).filter(p => p <= total);
  }

  // ── Dialog ────────────────────────────────────────────────────────────────

  openDetail(leave: LeaveRecord): void {
    const canDecide = this.isPending(leave.status);
    const ref = this.dialog.open(LeaveDetailDialogComponent, {
      width: '580px', maxHeight: '90vh', panelClass: 'leave-detail-panel',
      data:  { leave, mode: canDecide ? 'decide' : 'view', isPM: this.isPM },
    });
    ref.afterClosed().pipe(takeUntil(this.destroy$))
      .subscribe((result: LeaveDetailDialogResult | null) => {
        if (!result) return;
        const msg = result.action === 'approved'
          ? `✓ Leave approved for ${result.leave.userFullName}`
          : `Leave rejected for ${result.leave.userFullName}`;
        this.snackBar.open(msg, 'Close', {
          duration: 4000, horizontalPosition: 'right', verticalPosition: 'bottom',
        });
        this.load();
      });
  }

  // ── Document ──────────────────────────────────────────────────────────────

  hasDocument(leave: LeaveRecord): boolean { return !!leave.documentPath; }
  viewDocument(leave: LeaveRecord): void   { this.leaveService.openDocument(leave.id); }

  // ── Template helpers ──────────────────────────────────────────────────────

  typeLabel(type: LeaveType | string): string {
    return this.leaveTypeOptions.find(o => o.type === type)?.label ?? String(type);
  }

  statusClass(status: LeaveStatus | string): string {
    return this.statusConfig[status as LeaveStatus]?.color ?? 'gray';
  }

  statusLabel(status: LeaveStatus | string): string {
    return this.statusConfig[status as LeaveStatus]?.label ?? String(status);
  }

  isPending(status: LeaveStatus | string): boolean {
    return this.PENDING_STATUSES.has(status as LeaveStatus);
  }

  /** "Zina Wfelli" → "ZW" */
  initials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2)
      .map(w => w[0].toUpperCase()).join('');
  }

  /**
   * Deterministic avatar color from name — stable across reloads.
   * Matches the navy (ZW) and amber (AA) seen in the screenshot.
   */
  avatarColor(name: string): string {
  const palette = ['#1e3a5f', '#d4920a', '#1e3a5f', '#d4920a', '#1e3a5f', '#d4920a'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

  typeChipIcon(type: LeaveType | string): string {
  const m: Record<string, string> = {
    ANNUAL: 'calendar_today',
     SICK:   'add',    
    UNPAID: 'money_off',         
  };
  return m[String(type)] ?? 'event';
}

// Replace typeChipBg()
typeChipBg(type: LeaveType | string): string {
  const m: Record<string, string> = {
    ANNUAL: '#e8eef6',   // aligned to users navy-light
    SICK:   '#fef3c7',   // aligned to users gold-light
    UNPAID: '#e8eef6',
  };
  return m[String(type)] ?? '#e8eef6';
}

// Replace typeChipIconColor()
typeChipIconColor(type: LeaveType | string): string {
  const m: Record<string, string> = {
    ANNUAL: '#1e3a5f',   // users $navy
    SICK:   '#d4920a',   // users $gold
    UNPAID: '#1e3a5f',
  };
  return m[String(type)] ?? '#1e3a5f';
}
}