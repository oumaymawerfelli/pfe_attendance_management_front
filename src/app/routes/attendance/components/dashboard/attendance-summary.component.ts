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
  isoDate: string; // ← 'YYYY-MM-DD' used for the API call
  status:
    | 'present'
    | 'absent'
    | 'late'
    | 'half'
    | 'weekend'
    | 'holiday'
    | 'leave'
    | 'future'
    | 'empty';
  workedHours?: number;
  isToday: boolean;
  clickable: boolean; // ← false for empty/future/weekend cells
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
  selectedYear = new Date().getFullYear();

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

  years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  chartData: { name: string; value: number }[] = [];
  colorScheme: any = { domain: ['#5C6BC0', '#EF5350'] };
  view: [number, number] = [700, 280];

  calendarWeeks: CalendarDay[][] = [];
  weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  attendanceRate = 0;

  constructor(
    private attendanceService: AttendanceService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadSummary();
  }

  loadSummary(): void {
    this.loading = true;
    const filter: AttendanceFilter = { month: this.selectedMonth, year: this.selectedYear };

    this.attendanceService.getMySummary(filter).subscribe({
      next: data => {
        this.summary = data;
        this.chartData = (data.dailyHours ?? [])
          .filter(d => !['LEAVE', 'ABSENT'].includes((d.status ?? '').toUpperCase()))
          .map(d => ({ name: d.day, value: d.workedHours }));
        this.buildCalendar(data);
        this.computeRate(data);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  // ── Calendar build ────────────────────────────────────────────────────────

  buildCalendar(data: AttendanceSummary): void {
    const today = new Date();
    const firstDay = new Date(this.selectedYear, this.selectedMonth - 1, 1);
    const daysInMonth = new Date(this.selectedYear, this.selectedMonth, 0).getDate();
    const startOffset = (firstDay.getDay() + 6) % 7;

    const dayLookup = new Map<number, any>();
    (data.dailyHours ?? []).forEach(d => {
      const n = parseInt(d.day, 10);
      if (!isNaN(n)) dayLookup.set(n, d);
    });

    const cells: CalendarDay[] = [];

    // Empty padding cells
    for (let i = 0; i < startOffset; i++) {
      cells.push({ day: 0, isoDate: '', status: 'empty', isToday: false, clickable: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(this.selectedYear, this.selectedMonth - 1, d);
      const isToday = date.toDateString() === today.toDateString();
      const dow = date.getDay();
      const isFuture = date > today;
      const isWeekend = dow === 0 || dow === 6;
      const isoDate = this.toIsoDate(this.selectedYear, this.selectedMonth, d);

      let status: CalendarDay['status'] = 'future';
      let workedHours: number | undefined;
      let clickable = false;

      if (!isFuture) {
        if (isWeekend) {
          status = 'weekend';
          clickable = false;
        } else {
          clickable = true; // all past/today workdays are clickable
          const rec = dayLookup.get(d);
          if (rec) {
            workedHours = rec.workedHours;
            status = this.mapStatus(rec.status);
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
      while (week.length < 7)
        week.push({ day: 0, isoDate: '', status: 'empty', isToday: false, clickable: false });
      weeks.push(week);
    }
    this.calendarWeeks = weeks;
  }

  // ── Day click → open dialog ───────────────────────────────────────────────

  onDayClick(cell: CalendarDay): void {
    if (!cell.clickable || !cell.day) return;

    // Build a friendly label e.g. "Tuesday, 08 April 2025"
    const dateObj = new Date(this.selectedYear, this.selectedMonth - 1, cell.day);
    const dateLabel = dateObj.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    // Open dialog immediately with loading state
    const dialogData: DayDetailDialogData = {
      date: cell.isoDate,
      dateLabel,
      calStatus: cell.status,
      record: null,
      loading: true,
      error: '',
    };

    const ref = this.dialog.open(DayDetailDialogComponent, {
      data: dialogData,
      width: '420px',
      maxHeight: '90vh',
      panelClass: 'day-detail-dialog-panel',
    });

    // Fetch the record and update the dialog data in place
    // (dialog stays open; data binding updates the view reactively)
    this.attendanceService.getMyDayRecord(cell.isoDate).subscribe({
      next: record => {
        dialogData.record = record;
        dialogData.loading = false;
      },
      error: () => {
        // 404 = no record for that day (absent) — not a real error
        dialogData.record = null;
        dialogData.loading = false;
        dialogData.error = 'no-record';
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private toIsoDate(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  private mapStatus(raw: string): CalendarDay['status'] {
    switch ((raw ?? '').toUpperCase()) {
      case 'PRESENT':
        return 'present';
      case 'LATE':
        return 'late';
      case 'ABSENT':
        return 'absent';
      case 'HALF_DAY':
        return 'half';
      case 'EARLY_DEPARTURE':
        return 'present';
      case 'LEAVE':
        return 'leave';
      default:
        return 'absent';
    }
  }

  computeRate(data: AttendanceSummary): void {
    const worked = (data.presentDays ?? 0) + (data.lateDays ?? 0) + (data.halfDays ?? 0);
    const total = worked + (data.absentDays ?? 0);
    this.attendanceRate = total > 0 ? Math.round((worked / total) * 100) : 0;
  }

  get currentMonthLabel(): string {
    return this.months.find(m => m.value === this.selectedMonth)?.label ?? '';
  }

  get strokeDasharray(): string {
    const c = 2 * Math.PI * 30;
    return `${(c * this.attendanceRate) / 100} ${c}`;
  }

  onFilterChange(): void {
    this.loadSummary();
  }

  getTooltip(cell: CalendarDay): string {
    if (!cell.day || cell.status === 'empty' || cell.status === 'future') return '';
    if (cell.clickable) return 'Click to view details';
    const labels: Record<string, string> = {
      present: 'Present',
      absent: 'Absent',
      late: 'Late',
      half: 'Half Day',
      weekend: 'Weekend',
      holiday: 'Holiday',
      leave: 'On Leave',
    };
    const label = labels[cell.status] ?? cell.status;
    const hours =
      cell.workedHours != null && cell.workedHours > 0 ? ` · ${cell.workedHours.toFixed(1)}h` : '';
    return `${this.currentMonthLabel} ${cell.day} — ${label}${hours}`;
  }
}
