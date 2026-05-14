// attendance-history.component.ts
import { Component, OnInit } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { AttendanceService } from '../../services/attendance.service';
import { AttendanceRecord } from '../../models/attendance.model';

@Component({
  selector: 'app-attendance-history',
  templateUrl: './attendance-history.component.html',
  styleUrls: ['./attendance-history.component.scss'],
  animations: [
    trigger('expandCollapse', [
      state('collapsed', style({ height: '0px', opacity: 0, overflow: 'hidden' })),
      state('expanded',  style({ height: '*',   opacity: 1, overflow: 'hidden' })),
      transition('collapsed => expanded', animate('250ms cubic-bezier(0.4, 0, 0.2, 1)')),
      transition('expanded => collapsed', animate('200ms cubic-bezier(0.4, 0, 0.2, 1)')),
    ]),
  ],
})
export class AttendanceHistoryComponent implements OnInit {

  // ── State ──────────────────────────────────────────────────────────────────
  allData:  AttendanceRecord[] = [];
  filtered: AttendanceRecord[] = [];

  selectedMonth: number | null = new Date().getMonth() + 1;
  selectedYear:  number        = new Date().getFullYear();
  searchQuery = '';
  loading     = false;

  /** Tracks which cards are expanded by their date string */
  private expandedCards = new Set<string>();

  // ── Dropdowns ──────────────────────────────────────────────────────────────
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

  years: number[] = [];

  get dateRangeLabel(): string {
    const m = this.selectedMonth;
    const y = this.selectedYear;
    if (!m) return '';
    const start = new Date(y, m - 1, 1);
    const end   = new Date(y, m, 0);
    const fmt   = (d: Date) =>
      d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    return `${fmt(start)} – ${fmt(end)}`;
  }

  constructor(private attendanceService: AttendanceService) {}

  ngOnInit(): void {
    const current = new Date().getFullYear();
    this.years = Array.from({ length: 5 }, (_, i) => current - i);
    this.loadData();
  }

  // ── Filters ────────────────────────────────────────────────────────────────

  onFilterChange(): void {
    this.expandedCards.clear();
    this.loadData();
  }

  applySearch(): void {
    const q = this.searchQuery.trim().toLowerCase();
    this.filtered = q
      ? this.allData.filter(r =>
          (r.status ?? '').toLowerCase().includes(q) ||
          this.statusLabel(r.status).toLowerCase().includes(q) ||
          new Date(r.date).toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
          }).toLowerCase().includes(q)
        )
      : [...this.allData];
  }

  openFilterDialog(): void {
    // Wire up to your filter dialog / bottom-sheet here
  }

  // ── Data ───────────────────────────────────────────────────────────────────

  loadData(): void {
    this.loading = true;

    const filter: { month?: number; year?: number } = { year: this.selectedYear };
    if (this.selectedMonth !== null) filter.month = this.selectedMonth;

    this.attendanceService.getMyAttendance(filter).subscribe({
      next: (data: AttendanceRecord[]) => {
        this.allData = data.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        this.filtered = [...this.allData];
        this.loading  = false;
      },
      error: (err: any) => {
        console.error('Failed to load attendance history:', err);
        this.allData  = [];
        this.filtered = [];
        this.loading  = false;
      },
    });
  }

  // ── Expand / collapse ──────────────────────────────────────────────────────

  toggleExpand(row: AttendanceRecord): void {
    const key = String(row.date);
    if (this.expandedCards.has(key)) {
      this.expandedCards.delete(key);
    } else {
      this.expandedCards.add(key);
    }
  }

  isExpanded(row: AttendanceRecord): boolean {
    return this.expandedCards.has(String(row.date));
  }

  // ── Status helpers ─────────────────────────────────────────────────────────

  cardClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'PRESENT':          return 'card-ontime';
      case 'LATE':             return 'card-late';
      case 'EARLY_DEPARTURE':  return 'card-late';
      case 'HALF_DAY':         return 'card-half';
      case 'ABSENT':           return 'card-absent';
      default:                 return '';
    }
  }

  statusDotClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'PRESENT':          return 'dot-ontime';
      case 'LATE':             return 'dot-late';
      case 'EARLY_DEPARTURE':  return 'dot-late';
      case 'HALF_DAY':         return 'dot-half';
      case 'ABSENT':           return 'dot-absent';
      default:                 return '';
    }
  }

  statusLabel(status: string): string {
    switch (status?.toUpperCase()) {
      case 'PRESENT':          return 'On time';
      case 'LATE':             return 'Late';
      case 'EARLY_DEPARTURE':  return 'Early out';
      case 'HALF_DAY':         return 'Half day';
      case 'ABSENT':           return 'Absent';
      default:                 return status ?? '—';
    }
  }

  countByStatus(status: string): number {
    return this.filtered.filter(r => r.status?.toUpperCase() === status).length;
  }

  // ── Duration helpers ───────────────────────────────────────────────────────

  /** Decimal hours → "Xh Ym"  e.g. 7.883 → "7h 53m" */
  formatDuration(hours: number | null | undefined): string {
    if (hours == null) return '—';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${String(m).padStart(2, '0')}m`;
  }

  /** Worked hours as % of 8-hour day (capped at 100) */
  hoursPercent(hours: number | null | undefined): number {
    if (!hours) return 0;
    return Math.min(100, Math.round((hours / 8) * 100));
  }

  /** CSS class for the diff value */
  diffClass(hours: number | null | undefined): string {
    if (hours == null) return '';
    if (hours >= 8)  return 'over';
    if (hours < 8)   return 'under';
    return 'exact';
  }

  /** Shows "+Xh Ym" or "-Xh Ym" relative to 8-hour target */
  formatDiff(hours: number | null | undefined): string {
    if (hours == null) return '—';
    const diff = hours - 8;
    const abs  = Math.abs(diff);
    const h    = Math.floor(abs);
    const m    = Math.round((abs - h) * 60);
    const sign = diff >= 0 ? '+' : '-';
    return `${sign}${h}h ${String(m).padStart(2, '0')}m`;
  }
}