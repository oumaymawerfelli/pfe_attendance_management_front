import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { AttendanceSummaryComponent, CalendarDay } from './attendance-summary.component';
import { AttendanceService } from '../../services/attendance.service';
import { AttendanceSummary } from '../../models/attendance.model';

// ── Mock data ─────────────────────────────────────────────────────────────────

const mockSummary: AttendanceSummary = {
  presentDays: 15, lateDays: 3, absentDays: 2,
  halfDays: 1,     leaveDays: 1,
  dailyHours: [
    { day: '1', status: 'PRESENT',  workedHours: 8   },
    { day: '2', status: 'LATE',     workedHours: 7.5 },
    { day: '3', status: 'ABSENT',   workedHours: 0   },
    { day: '4', status: 'HALF_DAY', workedHours: 4   },
  ],
} as any;

describe('AttendanceSummaryComponent', () => {
  let component: AttendanceSummaryComponent;
  let fixture:   ComponentFixture<AttendanceSummaryComponent>;
  let serviceSpy: jasmine.SpyObj<AttendanceService>;
  let dialogSpy:  jasmine.SpyObj<MatDialog>;

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('AttendanceService', ['getMySummary', 'getMyDayRecord']);
    serviceSpy.getMySummary.and.returnValue(of(mockSummary));
    serviceSpy.getMyDayRecord.and.returnValue(of(null as any));

    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    dialogSpy.open.and.returnValue({ componentInstance: {} } as any);

    await TestBed.configureTestingModule({
      declarations: [AttendanceSummaryComponent],
      schemas:      [NO_ERRORS_SCHEMA],
      providers: [
        { provide: AttendanceService, useValue: serviceSpy },
        { provide: MatDialog,         useValue: dialogSpy  },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(AttendanceSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  // ── Creation & init ───────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialise selectedMonth to the current month', () => {
    expect(component.selectedMonth).toBe(new Date().getMonth() + 1);
  });

  it('should initialise selectedYear to the current year', () => {
    expect(component.selectedYear).toBe(new Date().getFullYear());
  });

  it('should call getMySummary on init', () => {
    expect(serviceSpy.getMySummary).toHaveBeenCalledWith({
      month: component.selectedMonth,
      year:  component.selectedYear,
    });
  });

  it('should set loading=false after successful load', () => {
    expect(component.loading).toBeFalse();
  });

  it('should populate summary after load', () => {
    expect(component.summary).toEqual(mockSummary);
  });

  it('should set loading=false on error', () => {
    serviceSpy.getMySummary.and.returnValue(throwError(() => new Error('fail')));
    component.loadSummary();
    expect(component.loading).toBeFalse();
  });

  // ── onFilterChange ────────────────────────────────────────────────────────

  it('should reload on filter change', () => {
    serviceSpy.getMySummary.calls.reset();
    component.onFilterChange();
    expect(serviceSpy.getMySummary).toHaveBeenCalled();
  });

  // ── Month navigation ──────────────────────────────────────────────────────

  it('prevMonth() should decrement month', () => {
    component.selectedMonth = 5;
    component.prevMonth();
    expect(component.selectedMonth).toBe(4);
  });

  it('prevMonth() should wrap to December and decrement year', () => {
    component.selectedMonth = 1;
    component.selectedYear  = 2026;
    component.prevMonth();
    expect(component.selectedMonth).toBe(12);
    expect(component.selectedYear).toBe(2025);
  });

  it('nextMonth() should increment month', () => {
    component.selectedMonth = 1;
    component.selectedYear  = 2020;
    component.nextMonth();
    expect(component.selectedMonth).toBe(2);
  });

  it('nextMonth() should wrap to January and increment year', () => {
    component.selectedMonth = 12;
    component.selectedYear  = 2020;
    component.nextMonth();
    expect(component.selectedMonth).toBe(1);
    expect(component.selectedYear).toBe(2021);
  });

  it('nextMonth() should not advance past the current month', () => {
    const now = new Date();
    component.selectedMonth = now.getMonth() + 1;
    component.selectedYear  = now.getFullYear();
    serviceSpy.getMySummary.calls.reset();
    component.nextMonth();
    expect(serviceSpy.getMySummary).not.toHaveBeenCalled();
  });

  it('goToToday() should reset to the current month and year', () => {
    component.selectedMonth = 1;
    component.selectedYear  = 2020;
    component.goToToday();
    expect(component.selectedMonth).toBe(new Date().getMonth() + 1);
    expect(component.selectedYear).toBe(new Date().getFullYear());
  });

  // ── computeRate ───────────────────────────────────────────────────────────

  it('should compute attendance rate correctly', () => {
    // worked = 15 + 3 + 1 = 19, total = 19 + 2 = 21 → 90%
    component.computeRate(mockSummary);
    expect(component.attendanceRate).toBe(Math.round((19 / 21) * 100));
  });

  it('should return 0 rate when total is 0', () => {
    component.computeRate({ presentDays: 0, lateDays: 0, absentDays: 0, halfDays: 0, leaveDays: 0 } as any);
    expect(component.attendanceRate).toBe(0);
  });

  // ── statusBars ────────────────────────────────────────────────────────────

  it('should return 5 status bars', () => {
    expect(component.statusBars.length).toBe(5);
  });

  it('should map summary values to status bars', () => {
    const present = component.statusBars.find(b => b.label === 'PRESENT');
    expect(present?.value).toBe(mockSummary.presentDays);
  });

  it('should return 0 for bars when summary is null', () => {
    component.summary = null;
    component.statusBars.forEach(b => expect(b.value).toBe(0));
  });

  // ── currentMonthLabel ─────────────────────────────────────────────────────

  it('should return correct month label', () => {
    component.selectedMonth = 1;
    expect(component.currentMonthLabel).toBe('January');
    component.selectedMonth = 12;
    expect(component.currentMonthLabel).toBe('December');
  });

  // ── strokeDasharray ───────────────────────────────────────────────────────

 // ✅ after
it('should compute strokeDasharray from attendanceRate', () => {
  component.attendanceRate = 100;
  const c        = 2 * Math.PI * 28;
  const progress = (c * 100) / 100;   // same as getter
  expect(component.strokeDasharray).toBe(`${progress} ${c}`);
});

it('should return "0 C" for 0% rate', () => {
  component.attendanceRate = 0;
  const c = 2 * Math.PI * 28;
  expect(component.strokeDasharray).toBe(`0 ${c}`);
});

it('should compute strokeDasharray proportionally', () => {
  component.attendanceRate = 50;
  const c        = 2 * Math.PI * 28;
  const progress = (c * 50) / 100;    // same as getter
  expect(component.strokeDasharray).toBe(`${progress} ${c}`);
});

  it('should return "0 C" for 0% rate', () => {
    component.attendanceRate = 0;
    const c = 2 * Math.PI * 28;
    expect(component.strokeDasharray).toBe(`0 ${c}`);
  });

  // ── statusLabel ───────────────────────────────────────────────────────────

  it('should return correct labels for known statuses', () => {
    expect(component.statusLabel('present')).toBe('Present');
    expect(component.statusLabel('late')).toBe('Late');
    expect(component.statusLabel('absent')).toBe('Absent');
    expect(component.statusLabel('half')).toBe('Half Day');
    expect(component.statusLabel('leave')).toBe('On Leave');
    expect(component.statusLabel('holiday')).toBe('Holiday');
  });

  it('should return the raw value for unknown statuses', () => {
    expect(component.statusLabel('custom')).toBe('custom');
  });

  // ── getTooltip ────────────────────────────────────────────────────────────

  const emptyCell  = (): CalendarDay => ({ day: 0,  isoDate: '',           status: 'empty',   isToday: false, clickable: false });
  const futureCell = (): CalendarDay => ({ day: 15, isoDate: '2099-01-15', status: 'future',  isToday: false, clickable: false });
  const weekendCell= (): CalendarDay => ({ day: 6,  isoDate: '2026-05-06', status: 'weekend', isToday: false, clickable: false });
  const clickableCell = (): CalendarDay => ({ day: 1, isoDate: '2026-05-01', status: 'present', isToday: false, clickable: true });
  const nonClickableCell = (): CalendarDay => ({ day: 1, isoDate: '2026-05-01', status: 'absent', isToday: false, clickable: false });

  it('should return empty string for empty/future/weekend cells', () => {
    expect(component.getTooltip(emptyCell())).toBe('');
    expect(component.getTooltip(futureCell())).toBe('');
    expect(component.getTooltip(weekendCell())).toBe('');
  });

  it('should return "Click to view details" for clickable cells', () => {
    expect(component.getTooltip(clickableCell())).toBe('Click to view details');
  });

  it('should return date+status label for non-clickable past cells', () => {
    component.selectedMonth = 5;
    const tooltip = component.getTooltip(nonClickableCell());
    expect(tooltip).toContain('May');
    expect(tooltip).toContain('Absent');
  });

  // ── buildCalendar ─────────────────────────────────────────────────────────

  it('should build calendar weeks', () => {
    component.buildCalendar(mockSummary);
    expect(component.calendarWeeks.length).toBeGreaterThan(0);
    component.calendarWeeks.forEach(week => expect(week.length).toBe(7));
  });

  it('should mark day 1 as present from dailyHours', () => {
    component.selectedMonth = 5;
    component.selectedYear  = 2026;
    component.buildCalendar(mockSummary);
    const allCells = component.calendarWeeks.flat();
    const day1 = allCells.find(c => c.day === 1);
    expect(day1?.status).toBe('present');
  });

  it('should mark missing weekdays as absent', () => {
    component.selectedMonth = 5;
    component.selectedYear  = 2026;
    const sparseData = { ...mockSummary, dailyHours: [] };
    component.buildCalendar(sparseData);
    const allCells  = component.calendarWeeks.flat();
    const weekdays  = allCells.filter(c => c.day > 0 && !['weekend', 'future', 'empty'].includes(c.status));
    expect(weekdays.every(c => c.status === 'absent')).toBeTrue();
  });

  it('should mark weekend days correctly', () => {
    component.selectedMonth = 5;
    component.selectedYear  = 2026;
    component.buildCalendar(mockSummary);
    const allCells = component.calendarWeeks.flat();
    // 2026-05-02 is a Saturday
    const sat = allCells.find(c => c.isoDate === '2026-05-02');
    expect(sat?.status).toBe('weekend');
    expect(sat?.clickable).toBeFalse();
  });

  it('should fill empty leading cells before the first day', () => {
    component.selectedMonth = 5;
    component.selectedYear  = 2026;
    component.buildCalendar(mockSummary);
    // 2026-05-01 is a Friday (index 4 in Mon-based grid) → 4 empty cells
    const firstWeek = component.calendarWeeks[0];
    const emptyCells = firstWeek.filter(c => c.status === 'empty');
    expect(emptyCells.length).toBe(4);
  });

  // ── onDayClick ────────────────────────────────────────────────────────────

  it('should open dialog on clickable day', () => {
    const cell = clickableCell();
    serviceSpy.getMyDayRecord.and.returnValue(of(null as any));
    component.onDayClick(cell);
    expect(dialogSpy.open).toHaveBeenCalled();
  });

  it('should not open dialog for non-clickable cell', () => {
    dialogSpy.open.calls.reset();
    component.onDayClick(nonClickableCell());
    expect(dialogSpy.open).not.toHaveBeenCalled();
  });

  it('should not open dialog for cell with day=0', () => {
    dialogSpy.open.calls.reset();
    component.onDayClick({ ...clickableCell(), day: 0 });
    expect(dialogSpy.open).not.toHaveBeenCalled();
  });

  it('should call getMyDayRecord with the cell isoDate', () => {
    const cell = clickableCell();
    serviceSpy.getMyDayRecord.and.returnValue(of(null as any));
    component.onDayClick(cell);
    expect(serviceSpy.getMyDayRecord).toHaveBeenCalledWith(cell.isoDate);
  });

  // ── buildChartTicks ───────────────────────────────────────────────────────

  it('should set yMax to nearest multiple of 5 above max value', () => {
    const data = { ...mockSummary, presentDays: 17 };
    (component as any).buildChartTicks(data);
    expect(component.yMax).toBe(20);
  });

  it('should always use a minimum yMax of 5', () => {
    const data = { presentDays: 0, lateDays: 0, absentDays: 0, halfDays: 0, leaveDays: 0 };
    (component as any).buildChartTicks(data);
    expect(component.yMax).toBe(5);
  });
});