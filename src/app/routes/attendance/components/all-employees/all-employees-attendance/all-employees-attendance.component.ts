import { Component, OnInit, OnDestroy } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
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

  // ── Role flags ────────────────────────────────────────────────────────────
  isPM      = false;
  isGMAdmin = false;

  // ── Page header ───────────────────────────────────────────────────────────
  pageTitle    = 'Attendance Management';
  pageSubtitle = 'Monitor and review employee attendance records';

  // ── Data ──────────────────────────────────────────────────────────────────
  allRecords:   AttendanceRecord[] = [];
  records:      AttendanceRecord[] = [];
  pagedRecords: AttendanceRecord[] = [];

  loading = false;
  error   = '';

  // ── Filters ───────────────────────────────────────────────────────────────
  selectedMonth: number | null = null;
  selectedYear: number = new Date().getFullYear();
  searchEmail = '';

  months = [
    { value: 1,  label: 'January'   },
    { value: 2,  label: 'February'  },
    { value: 3,  label: 'March'     },
    { value: 4,  label: 'April'     },
    { value: 5,  label: 'May'       },
    { value: 6,  label: 'June'      },
    { value: 7,  label: 'July'      },
    { value: 8,  label: 'August'    },
    { value: 9,  label: 'September' },
    { value: 10, label: 'October'   },
    { value: 11, label: 'November'  },
    { value: 12, label: 'December'  },
  ];

  years = [2024, 2025, 2026];

  displayedColumns = ['employee', 'date', 'checkIn', 'checkOut', 'status', 'workedHours', 'overtime'];

  // ── Pagination ────────────────────────────────────────────────────────────
  pageStart   = 1;
  pageEnd     = 10;
  currentPage = 0;
  currentSize = 10;

  private destroy$ = new Subject<void>();

  constructor(
    private attendanceService: AttendanceService,
    private authService:       AuthService,
  ) {}

  ngOnInit(): void {
    this.authService.user()
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.isPM      = hasRole(user, 'PROJECT_MANAGER');
        this.isGMAdmin = hasAnyRole(user, 'GENERAL_MANAGER', 'ADMIN');

        if (this.isPM) {
          this.pageTitle    = 'My Team Attendance';
          this.pageSubtitle = 'Monitor attendance records for your team members';
        }

        this.load();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  load(): void {
    this.loading     = true;
    this.error       = '';
    this.searchEmail = '';

    const filter: AttendanceFilter = {};
    if (this.selectedMonth) filter.month = this.selectedMonth;
    if (this.selectedYear)  filter.year  = this.selectedYear;

    const request$ = this.isPM
      ? this.attendanceService.getTeamAttendance(filter)
      : this.attendanceService.getAllAttendance(filter);

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: data => {
        this.allRecords = data;
        this.records    = data;
        this.currentPage = 0;
        this.updatePage();
        this.loading = false;
      },
      error: err => {
        this.error   = err?.error?.message || 'Failed to load attendance records.';
        this.loading = false;
      },
    });
  }

  onFilterChange(): void { this.load(); }

  // ── Search ────────────────────────────────────────────────────────────────

  onEmailSearch(): void {
    const term = this.searchEmail.trim().toLowerCase();
    this.records = term
      ? this.allRecords.filter(r =>
          r.userEmail?.toLowerCase().includes(term) ||
          r.userFullName?.toLowerCase().includes(term)
        )
      : this.allRecords;
    this.currentPage = 0;
    this.updatePage();
  }

  clearSearch(): void {
    this.searchEmail = '';
    this.records     = this.allRecords;
    this.currentPage = 0;
    this.updatePage();
  }

  // ── Pagination ────────────────────────────────────────────────────────────

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.currentSize = event.pageSize;
    this.updatePage();
  }

  private updatePage(): void {
    const total      = this.records.length;
    const start      = this.currentPage * this.currentSize;
    const end        = Math.min(start + this.currentSize, total);
    this.pagedRecords = this.records.slice(start, end);
    this.pageStart   = total === 0 ? 0 : start + 1;
    this.pageEnd     = end;
  }

  // ── Status helpers ────────────────────────────────────────────────────────

  statusClass(status: string): string {
    const map: Record<string, string> = {
      PRESENT:          'status-present',
      LATE:             'status-late',
      EARLY_DEPARTURE:  'status-early-departure',
      ABSENT:           'status-absent',
      HALF_DAY:         'status-half-day',
    };
    return map[status?.toUpperCase()] ?? '';
  }

  formatStatus(status: string): string {
    if (!status) return '';
    return status.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  // ── Avatar helpers ────────────────────────────────────────────────────────

  initials(name: string): string {
    if (!name) return '?';
    return name.split(' ').filter(Boolean).slice(0, 2)
      .map(w => w[0].toUpperCase()).join('');
  }

  avatarColor(name: string): string {
    const palette = [
      '#1e3a5f', // navy
      '#d4920a', // gold
      '#1e3a5f',
      '#d4920a',
      '#1e3a5f',
      '#d4920a',
    ];
    if (!name) return palette[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return palette[Math.abs(hash) % palette.length];
  }
}