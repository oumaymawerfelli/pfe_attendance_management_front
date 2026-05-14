import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AttendanceService } from '../../services/attendance.service';
import { AttendanceSummary, AttendanceFilter } from '../../models/attendance.model';
import {
  DayDetailDialogComponent,
  DayDetailDialogData,
} from '../day-detail-dialog/day-detail-dialog.component';

export interface CalendarDay {
  day: number;
  isoDate: string;
  status:
    | 'present' | 'absent' | 'late' | 'half'
    | 'weekend' | 'holiday' | 'leave' | 'future' | 'empty';
  workedHours?: number;
  isToday:   boolean;
  clickable: boolean;
}

@Component({
  selector: 'app-attendance-summary',
  templateUrl: './attendance-summary.component.html',
  styleUrls: ['./attendance-summary.component.scss'],
})
export class AttendanceSummaryComponent implements OnInit {

  summary: AttendanceSummary | null = null;
  loading = true;

  selectedMonth = new Date().getMonth() + 1;
  selectedYear  = new Date().getFullYear();

  months = [
    { value: 1,  label: 'January'   }, { value: 2,  label: 'February'  },
    { value: 3,  label: 'March'     }, { value: 4,  label: 'April'     },
    { value: 5,  label: 'May'       }, { value: 6,  label: 'June'      },
    { value: 7,  label: 'July'      }, { value: 8,  label: 'August'    },
    { value: 9,  label: 'September' }, { value: 10, label: 'October'   },
    { value: 11, label: 'November'  }, { value: 12, label: 'December'  },
  ];

  years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  calendarWeeks: CalendarDay[][] = [];
  weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  attendanceRate = 0;

  // ── Chart state ───────────────────────────────────────────────────────────
  yMax   = 30;
  yTicks: number[] = [30, 25, 20, 15, 10, 5, 0];

  readonly legendItems = [
    { key: 'present', label: 'Present'  },
    { key: 'late',    label: 'Late'     },
    { key: 'absent',  label: 'Absent'   },
    { key: 'half',    label: 'Half Day' },
    { key: 'leave',   label: 'On Leave' },
    { key: 'holiday', label: 'Holiday'  },
    { key: 'weekend', label: 'Weekend'  },
  ];

  constructor(
    private attendanceService: AttendanceService,
    private dialog:            MatDialog,
  ) {}

  ngOnInit(): void { this.loadSummary(); }

  // ── Data loading ──────────────────────────────────────────────────────────

  loadSummary(): void {
    this.loading = true;
    const filter: AttendanceFilter = {
      month: this.selectedMonth,
      year:  this.selectedYear,
    };

    this.attendanceService.getMySummary(filter).subscribe({
      next: data => {
        this.summary = data;
        this.buildCalendar(data);
        this.computeRate(data);
        this.buildChartTicks(data);
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  onFilterChange(): void { this.loadSummary(); }

  // ── Month navigation ──────────────────────────────────────────────────────

  prevMonth(): void {
    if (this.selectedMonth === 1) {
      this.selectedMonth = 12;
      this.selectedYear--;
    } else {
      this.selectedMonth--;
    }
    this.loadSummary();
  }

  nextMonth(): void {
    const now = new Date();
    if (
      this.selectedYear > now.getFullYear() ||
      (this.selectedYear === now.getFullYear() && this.selectedMonth >= now.getMonth() + 1)
    ) return;

    if (this.selectedMonth === 12) {
      this.selectedMonth = 1;
      this.selectedYear++;
    } else {
      this.selectedMonth++;
    }
    this.loadSummary();
  }

  goToToday(): void {
    this.selectedMonth = new Date().getMonth() + 1;
    this.selectedYear  = new Date().getFullYear();
    this.loadSummary();
  }

  // ── Calendar build ────────────────────────────────────────────────────────

  buildCalendar(data: AttendanceSummary): void {
    const today       = new Date();
    const firstDay    = new Date(this.selectedYear, this.selectedMonth - 1, 1);
    const daysInMonth = new Date(this.selectedYear, this.selectedMonth, 0).getDate();
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday-based

    const dayLookup = new Map<number, any>();
    (data.dailyHours ?? []).forEach(d => {
      const n = parseInt(d.day, 10);
      if (!isNaN(n)) dayLookup.set(n, d);
    });

    const cells: CalendarDay[] = [];

    for (let i = 0; i < startOffset; i++) {
      cells.push({ day: 0, isoDate: '', status: 'empty', isToday: false, clickable: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date      = new Date(this.selectedYear, this.selectedMonth - 1, d);
      const isToday   = date.toDateString() === today.toDateString();
      const dow       = date.getDay();
      const isFuture  = date > today;
      const isWeekend = dow === 0 || dow === 6;
      const isoDate   = this.toIsoDate(this.selectedYear, this.selectedMonth, d);

      let status: CalendarDay['status'] = 'future';
      let workedHours: number | undefined;
      let clickable = false;

      if (!isFuture) {
        if (isWeekend) {
          status    = 'weekend';
          clickable = false;
        } else {
          clickable = true;
          const rec = dayLookup.get(d);
          if (rec) {
            workedHours = rec.workedHours;
            status      = this.mapStatus(rec.status);
          } else {
            status = 'absent';
          }
        }
      }

      cells.push({ day: d, isoDate, status, isToday, workedHours, clickable });
    }

    const weeks: CalendarDay[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      const week = cells.slice(i, i + 7);
      while (week.length < 7) {
        week.push({ day: 0, isoDate: '', status: 'empty', isToday: false, clickable: false });
      }
      weeks.push(week);
    }
    this.calendarWeeks = weeks;
  }

  // ── Day click ─────────────────────────────────────────────────────────────

  onDayClick(cell: CalendarDay): void {
    if (!cell.clickable || !cell.day) return;

    const dateObj   = new Date(this.selectedYear, this.selectedMonth - 1, cell.day);
    const dateLabel = dateObj.toLocaleDateString('en-GB', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    });

    const dialogData: DayDetailDialogData = {
      date: cell.isoDate, dateLabel, calStatus: cell.status,
      record: null, loading: true, error: '',
    };

    this.dialog.open(DayDetailDialogComponent, {
      data: dialogData, width: '420px', maxHeight: '90vh',
      panelClass: 'day-detail-dialog-panel',
    });

    this.attendanceService.getMyDayRecord(cell.isoDate).subscribe({
      next: record => { dialogData.record = record;  dialogData.loading = false; },
      error: ()     => { dialogData.record = null;    dialogData.loading = false; dialogData.error = 'no-record'; },
    });
  }

  // ── Chart helpers ─────────────────────────────────────────────────────────

  get statusBars() {
  return [
    { label: 'PRESENT',  value: this.summary?.presentDays  ?? 0, color: '#16a34a' }, // $green
    { label: 'LATE',     value: this.summary?.lateDays     ?? 0, color: '#d4920a' }, // $gold
    { label: 'ABSENT',   value: this.summary?.absentDays   ?? 0, color: '#dc2626' }, // $red
    { label: 'HALF DAY', value: this.summary?.halfDays     ?? 0, color: '#7c3aed' }, // $purple
    { label: 'LEAVE',    value: this.summary?.leaveDays    ?? 0, color: '#0891b2' }, // $teal
  ];
}

  private buildChartTicks(data: AttendanceSummary): void {
    const values = [
      data.presentDays ?? 0, data.lateDays   ?? 0,
      data.absentDays  ?? 0, data.halfDays   ?? 0,
      data.leaveDays   ?? 0,
    ];
    const max    = Math.max(...values, 5);
    this.yMax    = Math.ceil(max / 5) * 5;
    const steps  = this.yMax / 5;
    this.yTicks  = Array.from({ length: steps + 1 }, (_, i) => (steps - i) * 5);
  }

  // ── Rate & helpers ────────────────────────────────────────────────────────

  computeRate(data: AttendanceSummary): void {
    const worked = (data.presentDays ?? 0) + (data.lateDays ?? 0) + (data.halfDays ?? 0);
    const total  = worked + (data.absentDays ?? 0);
    this.attendanceRate = total > 0 ? Math.round((worked / total) * 100) : 0;
  }

  statusLabel(status: string): string {
    const m: Record<string, string> = {
      present: 'Present', late: 'Late', absent: 'Absent',
      half: 'Half Day', leave: 'On Leave', holiday: 'Holiday',
    };
    return m[status] ?? status;
  }

  get currentMonthLabel(): string {
    return this.months.find(m => m.value === this.selectedMonth)?.label ?? '';
  }

  get strokeDasharray(): string {
    const c = 2 * Math.PI * 28;
    return `${(c * this.attendanceRate) / 100} ${c}`;
  }

  getTooltip(cell: CalendarDay): string {
    if (!cell.day || ['empty', 'future', 'weekend'].includes(cell.status)) return '';
    if (cell.clickable) return 'Click to view details';
    return `${this.currentMonthLabel} ${cell.day} — ${this.statusLabel(cell.status)}`;
  }

  private toIsoDate(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  private mapStatus(raw: string): CalendarDay['status'] {
    switch ((raw ?? '').toUpperCase()) {
      case 'PRESENT':         return 'present';
      case 'LATE':            return 'late';
      case 'ABSENT':          return 'absent';
      case 'HALF_DAY':        return 'half';
      case 'EARLY_DEPARTURE': return 'present';
      case 'LEAVE':           return 'leave';
      default:                return 'absent';
    }
  }
}