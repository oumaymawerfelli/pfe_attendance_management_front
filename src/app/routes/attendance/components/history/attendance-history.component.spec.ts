import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { AttendanceHistoryComponent } from './attendance-history.component';
import { AttendanceService } from '../../services/attendance.service';
import { AttendanceRecord } from '../../models/attendance.model';

// ── Mock data ─────────────────────────────────────────────────────────────────

// ✅ after
const makeRecord = (overrides: Record<string, any> = {}): AttendanceRecord => ({
  date:     '2026-05-01',
  status:   'PRESENT',
  checkIn:  '2026-05-01T09:00:00',  // full ISO — DatePipe happy
  checkOut: '2026-05-01T17:00:00',
  ...overrides,
} as any);

const mockRecords: AttendanceRecord[] = [
  makeRecord({ date: '2026-05-03', status: 'PRESENT'  }),
  makeRecord({ date: '2026-05-02', status: 'LATE'     }),
  makeRecord({ date: '2026-05-01', status: 'ABSENT'   }),
  makeRecord({ date: '2026-04-30', status: 'HALF_DAY' }),
  makeRecord({ date: '2026-04-29', status: 'EARLY_DEPARTURE' as any }),
];

describe('AttendanceHistoryComponent', () => {
  let component: AttendanceHistoryComponent;
  let fixture:   ComponentFixture<AttendanceHistoryComponent>;
  let serviceSpy: jasmine.SpyObj<AttendanceService>;

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('AttendanceService', ['getMyAttendance']);
    serviceSpy.getMyAttendance.and.returnValue(of([...mockRecords]));

    await TestBed.configureTestingModule({
      declarations: [AttendanceHistoryComponent],
      imports:      [NoopAnimationsModule],
      schemas:      [NO_ERRORS_SCHEMA],
      providers:    [{ provide: AttendanceService, useValue: serviceSpy }],
    }).compileComponents();

    fixture   = TestBed.createComponent(AttendanceHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // triggers ngOnInit
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

  it('should build a years array of 5 entries starting from the current year', () => {
    const current = new Date().getFullYear();
    expect(component.years.length).toBe(5);
    expect(component.years[0]).toBe(current);
    expect(component.years[4]).toBe(current - 4);
  });

  it('should have 12 months', () => {
    expect(component.months.length).toBe(12);
    expect(component.months[0]).toEqual({ value: 1, label: 'January' });
    expect(component.months[11]).toEqual({ value: 12, label: 'December' });
  });

  // ── loadData ──────────────────────────────────────────────────────────────

  it('should call getMyAttendance with year and month on init', () => {
    expect(serviceSpy.getMyAttendance).toHaveBeenCalledWith({
      year:  component.selectedYear,
      month: component.selectedMonth!,
    });
  });

  it('should not include month when selectedMonth is null', () => {
    component.selectedMonth = null;
    component.loadData();
    expect(serviceSpy.getMyAttendance).toHaveBeenCalledWith({ year: component.selectedYear });
  });

  it('should sort records by date descending', () => {
    const dates = component.allData.map(r => r.date);
    const sorted = [...dates].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    expect(dates).toEqual(sorted);
  });

  it('should set loading=false after data loads', () => {
    expect(component.loading).toBeFalse();
  });

  it('should populate filtered with all records after load', () => {
    expect(component.filtered.length).toBe(component.allData.length);
  });

  it('should set allData and filtered to [] on error', () => {
    serviceSpy.getMyAttendance.and.returnValue(throwError(() => new Error('fail')));
    component.loadData();
    expect(component.allData).toEqual([]);
    expect(component.filtered).toEqual([]);
    expect(component.loading).toBeFalse();
  });

  // ── onFilterChange ────────────────────────────────────────────────────────

  it('should reload data and clear expanded cards on filter change', () => {
    // Expand a card first
    component.toggleExpand(mockRecords[0]);
    expect(component.isExpanded(mockRecords[0])).toBeTrue();

    serviceSpy.getMyAttendance.calls.reset();
    component.onFilterChange();

    expect(component.isExpanded(mockRecords[0])).toBeFalse();
    expect(serviceSpy.getMyAttendance).toHaveBeenCalled();
  });

  // ── applySearch ───────────────────────────────────────────────────────────

  it('should show all records when search query is empty', () => {
    component.searchQuery = '';
    component.applySearch();
    expect(component.filtered.length).toBe(component.allData.length);
  });

  it('should filter by status value (case-insensitive)', () => {
    component.searchQuery = 'absent';
    component.applySearch();
    expect(component.filtered.every(r => r.status?.toUpperCase() === 'ABSENT')).toBeTrue();
  });

  it('should filter by status label', () => {
    component.searchQuery = 'on time'; // label for PRESENT
    component.applySearch();
    expect(component.filtered.every(r => r.status?.toUpperCase() === 'PRESENT')).toBeTrue();
  });

  it('should return no results for a query that matches nothing', () => {
    component.searchQuery = 'zzznomatch';
    component.applySearch();
    expect(component.filtered.length).toBe(0);
  });

  // ── toggleExpand / isExpanded ─────────────────────────────────────────────

  it('should expand a collapsed card', () => {
    const row = makeRecord({ date: '2026-05-10' });
    expect(component.isExpanded(row)).toBeFalse();
    component.toggleExpand(row);
    expect(component.isExpanded(row)).toBeTrue();
  });

  it('should collapse an expanded card', () => {
    const row = makeRecord({ date: '2026-05-11' });
    component.toggleExpand(row);
    component.toggleExpand(row);
    expect(component.isExpanded(row)).toBeFalse();
  });

  it('should track expansion independently per card', () => {
    const row1 = makeRecord({ date: '2026-05-12' });
    const row2 = makeRecord({ date: '2026-05-13' });
    component.toggleExpand(row1);
    expect(component.isExpanded(row1)).toBeTrue();
    expect(component.isExpanded(row2)).toBeFalse();
  });

  // ── dateRangeLabel ────────────────────────────────────────────────────────

  it('should return empty string when selectedMonth is null', () => {
    component.selectedMonth = null;
    expect(component.dateRangeLabel).toBe('');
  });

  it('should return a formatted date range for a given month/year', () => {
    component.selectedMonth = 1;
    component.selectedYear  = 2026;
    const label = component.dateRangeLabel;
    expect(label).toContain('January');
    expect(label).toContain('2026');
  });

  // ── cardClass ─────────────────────────────────────────────────────────────



  it('should return correct card class for each status', () => {
    expect(component.cardClass('PRESENT')).toBe('card-ontime');
    expect(component.cardClass('LATE')).toBe('card-late');
    expect(component.cardClass('EARLY_DEPARTURE')).toBe('card-late');
    expect(component.cardClass('HALF_DAY')).toBe('card-half');
    expect(component.cardClass('ABSENT')).toBe('card-absent');
    expect(component.cardClass('UNKNOWN')).toBe('');
  });

  it('should handle lowercase status in cardClass', () => {
    expect(component.cardClass('present')).toBe('card-ontime');
  });

  // ── statusDotClass ────────────────────────────────────────────────────────

  it('should return correct dot class for each status', () => {
    expect(component.statusDotClass('PRESENT')).toBe('dot-ontime');
    expect(component.statusDotClass('LATE')).toBe('dot-late');
    expect(component.statusDotClass('EARLY_DEPARTURE')).toBe('dot-late');
    expect(component.statusDotClass('HALF_DAY')).toBe('dot-half');
    expect(component.statusDotClass('ABSENT')).toBe('dot-absent');
    expect(component.statusDotClass('UNKNOWN')).toBe('');
  });

  // ── statusLabel ───────────────────────────────────────────────────────────

  it('should return correct label for each status', () => {
    expect(component.statusLabel('PRESENT')).toBe('On time');
    expect(component.statusLabel('LATE')).toBe('Late');
    expect(component.statusLabel('EARLY_DEPARTURE')).toBe('Early out');
    expect(component.statusLabel('HALF_DAY')).toBe('Half day');
    expect(component.statusLabel('ABSENT')).toBe('Absent');
  });

  it('should return the raw value for an unknown status', () => {
    expect(component.statusLabel('CUSTOM')).toBe('CUSTOM');
  });

  it('should return "—" for null/undefined status', () => {
    expect(component.statusLabel(null as any)).toBe('—');
    expect(component.statusLabel(undefined as any)).toBe('—');
  });

  // ── countByStatus ─────────────────────────────────────────────────────────

  it('should count records by status in filtered array', () => {
    component.filtered = mockRecords;
    expect(component.countByStatus('PRESENT')).toBe(1);
    expect(component.countByStatus('LATE')).toBe(1);
    expect(component.countByStatus('ABSENT')).toBe(1);
  });

  it('should return 0 for a status with no matches', () => {
    component.filtered = mockRecords;
    expect(component.countByStatus('REMOTE')).toBe(0);
  });

  // ── formatDuration ────────────────────────────────────────────────────────

  it('should return "—" for null/undefined', () => {
    expect(component.formatDuration(null)).toBe('—');
    expect(component.formatDuration(undefined)).toBe('—');
  });

  it('should format whole hours correctly', () => {
    expect(component.formatDuration(8)).toBe('8h 00m');
  });

  it('should format decimal hours correctly', () => {
    expect(component.formatDuration(7.5)).toBe('7h 30m');
    expect(component.formatDuration(7.883)).toBe('7h 53m');
  });

  it('should pad minutes with leading zero', () => {
    expect(component.formatDuration(8.083)).toBe('8h 05m');
  });

  // ── hoursPercent ─────────────────────────────────────────────────────────

  it('should return 0 for null/undefined/zero hours', () => {
    expect(component.hoursPercent(null)).toBe(0);
    expect(component.hoursPercent(undefined)).toBe(0);
    expect(component.hoursPercent(0)).toBe(0);
  });

  it('should return 100% for exactly 8 hours', () => {
    expect(component.hoursPercent(8)).toBe(100);
  });

  it('should cap at 100 for hours over 8', () => {
    expect(component.hoursPercent(10)).toBe(100);
  });

  it('should return correct percentage for partial hours', () => {
    expect(component.hoursPercent(4)).toBe(50);
    expect(component.hoursPercent(6)).toBe(75);
  });

  // ── diffClass ─────────────────────────────────────────────────────────────

  it('should return "" for null/undefined', () => {
    expect(component.diffClass(null)).toBe('');
    expect(component.diffClass(undefined)).toBe('');
  });

  it('should return "over" for hours >= 8', () => {
    expect(component.diffClass(8)).toBe('over');
    expect(component.diffClass(9)).toBe('over');
  });

  it('should return "under" for hours < 8', () => {
    expect(component.diffClass(7)).toBe('under');
    expect(component.diffClass(0)).toBe('under');
  });

  // ── formatDiff ────────────────────────────────────────────────────────────

  it('should return "—" for null/undefined', () => {
    expect(component.formatDiff(null)).toBe('—');
    expect(component.formatDiff(undefined)).toBe('—');
  });

  it('should show "+" for hours above 8', () => {
    expect(component.formatDiff(9)).toBe('+1h 00m');
    expect(component.formatDiff(8.5)).toBe('+0h 30m');
  });

  it('should show "-" for hours below 8', () => {
    expect(component.formatDiff(7)).toBe('-1h 00m');
    expect(component.formatDiff(6.5)).toBe('-1h 30m');
  });

  it('should show "+" for exactly 8 hours', () => {
    expect(component.formatDiff(8)).toBe('+0h 00m');
  });
});