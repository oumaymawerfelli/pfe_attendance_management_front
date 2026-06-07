// attendance-history.component.ts
import { Component, OnInit } from '@angular/core';
import { AttendanceService } from '../../services/attendance.service';
import { AttendanceRecord } from '../../models/attendance.model';

interface MonthGroup {
  label: string;
  items: AttendanceRecord[];
}

@Component({
  selector: 'app-attendance-history',
  templateUrl: './attendance-history.component.html',
  styleUrls: ['./attendance-history.component.scss'],
})
export class AttendanceHistoryComponent implements OnInit {

  allData:  AttendanceRecord[] = [];
  filtered: AttendanceRecord[] = [];

  selectedMonth: number | null = new Date().getMonth() + 1;
  selectedYear:  number        = new Date().getFullYear();
  searchQuery = '';
  loading     = false;
  refreshing  = false;
  groupedByMonth: MonthGroup[] = [];  // cached — avoids re-render on every change detection

  months = [
    { value: 1,  label: 'January'   }, { value: 2,  label: 'February'  },
    { value: 3,  label: 'March'     }, { value: 4,  label: 'April'     },
    { value: 5,  label: 'May'       }, { value: 6,  label: 'June'      },
    { value: 7,  label: 'July'      }, { value: 8,  label: 'August'    },
    { value: 9,  label: 'September' }, { value: 10, label: 'October'   },
    { value: 11, label: 'November'  }, { value: 12, label: 'December'  },
  ];

  years: number[] = [];

  // ── Computed ──────────────────────────────────────────

  get dateRangeLabel(): string {
    const m = this.selectedMonth;
    const y = this.selectedYear;
    if (!m) return `Year ${y}`;
    const start = new Date(y, m - 1, 1);
    const end   = new Date(y, m, 0);
    const fmt   = (d: Date) =>
      d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    return `${fmt(start)} – ${fmt(end)}`;
  }

  // groupedByMonth is now a field, updated only when data changes (see buildGroups)

  constructor(private attendanceService: AttendanceService) {}

  ngOnInit(): void {
    const current = new Date().getFullYear();
    this.years    = Array.from({ length: 5 }, (_, i) => current - i);
    this.loadData();
  }

  // ── Filters ───────────────────────────────────────────

  onFilterChange(): void { this.loadData(true); }

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
    this.buildGroups();
  }

  // ── Grouping ──────────────────────────────────────────

  private buildGroups(): void {
    const map = new Map<string, AttendanceRecord[]>();
    for (const r of this.filtered) {
      const d     = new Date(r.date);
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(r);
    }
    this.groupedByMonth = Array.from(map.entries())
      .map(([label, items]) => ({ label, items }));
  }

  // ── Data ──────────────────────────────────────────────

  loadData(soft = false): void {
    if (!soft) this.loading = true;
    this.refreshing = true;
    const filter: { month?: number; year?: number } = { year: this.selectedYear };
    if (this.selectedMonth !== null) filter.month = this.selectedMonth;

    this.attendanceService.getMyAttendance(filter).subscribe({
      next: (data: AttendanceRecord[]) => {
        this.allData  = data.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        this.filtered  = [...this.allData];
        this.buildGroups();
        this.loading   = false;
        this.refreshing = false;
      },
      error: () => {
        this.allData = this.filtered = [];
        this.loading    = false;
        this.refreshing = false;
      },
    });
  }

  // ── Status helpers ────────────────────────────────────

  cardClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'PRESENT': case 'EARLY_DEPARTURE': return 'card-ontime';
      case 'LATE':                            return 'card-late';
      case 'HALF_DAY':                        return 'card-half';
      case 'ABSENT':                          return 'card-absent';
      default:                                return 'card-ontime';
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

  // ── Duration helpers ──────────────────────────────────

  formatDuration(hours: number | null | undefined): string {
    if (hours == null) return '—';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${String(m).padStart(2, '0')}m`;
  }

  hoursPercent(hours: number | null | undefined): number {
    if (!hours) return 0;
    return Math.min(100, Math.round((hours / 8) * 100));
  }

  formatDiff(hours: number | null | undefined): string {
    if (hours == null) return '—';
    const diff = hours - 8;
    const abs  = Math.abs(diff);
    const h    = Math.floor(abs);
    const m    = Math.round((abs - h) * 60);
    return `${diff >= 0 ? '+' : '-'}${h}h ${String(m).padStart(2, '0')}m`;
  }
}