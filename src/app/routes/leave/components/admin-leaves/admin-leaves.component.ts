import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';
import { LeaveService } from '../../services/leave.service';
import { AuthService } from '@core/authentication/auth.service';
import { hasAnyRole, hasRole } from '@core/authentication/auth.guard';
import { LeaveRecord } from '../../models/leave.model';
import { LeaveDetailDialogComponent } from '../leave-detail-dialog/leave-detail-dialog.component';

@Component({
  selector: 'app-admin-leaves',
  templateUrl: './admin-leaves.component.html',
  styleUrls: ['./admin-leaves.component.scss'],
})
export class AdminLeavesComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns = ['employee', 'department', 'type', 'dates', 'days', 'status', 'actions'];
  dataSource = new MatTableDataSource<LeaveRecord>();
  loading = true;
  filter: 'ALL' | 'PENDING' = 'PENDING';

  isPM = false;
  isGMAdmin = false;
  pageTitle = 'Leave Requests';
  pageSubtitle = 'Manage leave requests';

  private destroy$ = new Subject<void>();

  constructor(
    private leaveService: LeaveService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.authService
      .user()
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.isPM = hasRole(user, 'PROJECT_MANAGER');
        this.isGMAdmin = hasAnyRole(user, 'GENERAL_MANAGER', 'ADMIN');
        this.pageTitle = this.isPM ? 'Team Leave Requests' : 'Leave Requests';
        this.pageSubtitle = this.isPM
          ? 'Manage leave requests for your team members'
          : 'Manage leave requests for all employees';
        this.load();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;

    const request$ = this.isPM
      ? this.filter === 'PENDING'
        ? this.leaveService.getTeamPendingLeaves()
        : this.leaveService.getTeamAllLeaves()
      : this.filter === 'PENDING'
      ? this.leaveService.getPendingLeaves()
      : this.leaveService.getAllLeaves();

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: data => {
        this.dataSource.data = data;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  // ── Document actions ──────────────────────────────────────────────────────

  /**
   * True when the backend has a stored PDF for this leave.
   * Relies on documentPath returned in LeaveResponseDTO — no localStorage needed.
   */
  hasDocument(leave: LeaveRecord): boolean {
    return !!leave.documentPath;
  }

  /** Opens the PDF served by the backend in a new tab (view + print). */
  viewDocument(leave: LeaveRecord): void {
    this.leaveService.openDocument(leave.id);
  }

  // ── Review dialog ─────────────────────────────────────────────────────────

  openDetail(leave: LeaveRecord, canDecide: boolean): void {
    const ref = this.dialog.open(LeaveDetailDialogComponent, {
      data: { leave, mode: canDecide ? 'decide' : 'view', isPM: this.isPM },
      width: '540px',
    });

    ref.afterClosed().subscribe(result => {
      if (!result) return;
      const msg = result.action === 'approved' ? 'Leave approved ✓' : 'Leave rejected';
      this.snackBar.open(msg, 'Close', { duration: 3000 });
      this.load(); // reload table so documentPath appears on the row
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  typeLabel(t: string): string {
    return ({ ANNUAL: 'Annual', SICK: 'Sick', UNPAID: 'Unpaid' } as any)[t] ?? t;
  }

  statusColor(s: string): string {
    return ({ PENDING: 'accent', APPROVED: 'primary', REJECTED: 'warn' } as any)[s] ?? '';
  }
}
