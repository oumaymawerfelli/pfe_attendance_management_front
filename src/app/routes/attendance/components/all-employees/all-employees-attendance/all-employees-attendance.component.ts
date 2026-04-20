import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { AttendanceService } from '../../../services/attendance.service';
import { AuthService } from '../../../../../core/authentication/auth.service';
import { hasAnyRole, hasRole } from '../../../../../core/authentication/auth.guard';
import { AttendanceRecord, AttendanceFilter } from '../../../models/attendance.model';

@Component({
  selector: 'app-all-employees-attendance',
  templateUrl: './all-employees-attendance.component.html',
  styleUrls: ['./all-employees-attendance.component.scss'],
})
export class AllEmployeesAttendanceComponent implements OnInit, OnDestroy {
  // ── Role flags (set once on init) ─────────────────────────────────────────
  isPM = false; // PROJECT_MANAGER
  isGMAdmin = false; // GENERAL_MANAGER or ADMIN

  // ── Page header (adapts to role) ───────────────────────────────────────────
  pageTitle = 'Attendance Management';
  pageSubtitle = 'View attendance records';

  // ── Data ──────────────────────────────────────────────────────────────────
  allRecords: AttendanceRecord[] = [];
  records: AttendanceRecord[] = [];

  loading = false;
  error = '';

  selectedMonth: number | null = null;
  selectedYear: number = new Date().getFullYear();
  searchEmail = '';

  months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  years = [2024, 2025, 2026];

  displayedColumns = [
    'employee',
    'date',
    'checkIn',
    'checkOut',
    'status',
    'workedHours',
    'overtime',
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private attendanceService: AttendanceService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Resolve role once, then load data
    this.authService
      .user()
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.isPM = hasRole(user, 'PROJECT_MANAGER');
        this.isGMAdmin = hasAnyRole(user, 'GENERAL_MANAGER', 'ADMIN');

        if (this.isPM) {
          this.pageTitle = 'My Team Attendance';
          this.pageSubtitle = 'View attendance records for your team members';
        } else {
          this.pageTitle = 'Attendance Management';
          this.pageSubtitle = 'View attendance records for all employees';
        }

        this.load();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.searchEmail = '';

    const filter: AttendanceFilter = {};
    if (this.selectedMonth) filter.month = this.selectedMonth;
    if (this.selectedYear) filter.year = this.selectedYear;

    // ── PM → team only | GM/Admin → all employees ─────────────────────────
    const request$ = this.isPM
      ? this.attendanceService.getTeamAttendance(filter)
      : this.attendanceService.getAllAttendance(filter);

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: data => {
        this.allRecords = data;
        this.records = data;
        this.loading = false;
      },
      error: err => {
        this.error = err?.error?.message || 'Failed to load attendance records.';
        this.loading = false;
      },
    });
  }

  onFilterChange(): void {
    this.load();
  }

  onEmailSearch(): void {
    const term = this.searchEmail.trim().toLowerCase();
    this.records = term
      ? this.allRecords.filter(r => r.userEmail?.toLowerCase().includes(term))
      : this.allRecords;
  }

  clearSearch(): void {
    this.searchEmail = '';
    this.records = this.allRecords;
  }

  getStatusColor(status: string): string {
    const map: Record<string, string> = {
      PRESENT: 'primary',
      LATE: 'warn',
      ABSENT: 'accent',
      HALF_DAY: 'accent',
      EARLY_DEPARTURE: 'warn',
    };
    return map[status] ?? '';
  }

  formatStatus(status: string): string {
    if (!status) return '';
    return status
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }
}
