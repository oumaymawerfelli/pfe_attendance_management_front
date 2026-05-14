import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { of, throwError } from 'rxjs';

import { AllEmployeesAttendanceComponent } from './all-employees-attendance.component';
import { AttendanceService } from '../../../services/attendance.service';
import { AuthService } from '../../../../../core/authentication/auth.service';
import { AttendanceRecord } from '../../../models/attendance.model';

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeRecord = (overrides: Partial<AttendanceRecord> = {}): AttendanceRecord =>
  ({ date: '2026-05-01', status: 'PRESENT', userEmail: 'a@test.com', userFullName: 'Alice Smith', ...overrides } as any);

const makeRecords = (n: number): AttendanceRecord[] =>
  Array.from({ length: n }, (_, i) => makeRecord({ userEmail: `user${i}@test.com` }));

// ── Spies ─────────────────────────────────────────────────────────────────────

let attendanceSpy: jasmine.SpyObj<AttendanceService>;
let authSpy: jasmine.SpyObj<AuthService>;

function setupAuth(roles: string[]) {
  authSpy.user.and.returnValue(of({ roles } as any));
}

describe('AllEmployeesAttendanceComponent', () => {
  let component: AllEmployeesAttendanceComponent;
  let fixture:   ComponentFixture<AllEmployeesAttendanceComponent>;

  beforeEach(async () => {
    attendanceSpy = jasmine.createSpyObj('AttendanceService', ['getAllAttendance', 'getTeamAttendance']);
    attendanceSpy.getAllAttendance.and.returnValue(of([]));
    attendanceSpy.getTeamAttendance.and.returnValue(of([]));

    authSpy = jasmine.createSpyObj('AuthService', ['user']);
    setupAuth(['ROLE_ADMIN']);

    await TestBed.configureTestingModule({
      declarations: [AllEmployeesAttendanceComponent],
      schemas:      [NO_ERRORS_SCHEMA],
      providers: [
        { provide: AttendanceService, useValue: attendanceSpy },
        { provide: AuthService,       useValue: authSpy },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(AllEmployeesAttendanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  // ── Creation ──────────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── Role resolution ───────────────────────────────────────────────────────

  it('should set isGMAdmin=true and isPM=false for ADMIN role', () => {
    expect(component.isGMAdmin).toBeTrue();
    expect(component.isPM).toBeFalse();
  });

  it('should set isGMAdmin=true for GENERAL_MANAGER role', () => {
    setupAuth(['ROLE_GENERAL_MANAGER']);
    component.ngOnInit();
    expect(component.isGMAdmin).toBeTrue();
  });

  it('should set isPM=true and isGMAdmin=false for PROJECT_MANAGER role', () => {
    setupAuth(['ROLE_PROJECT_MANAGER']);
    attendanceSpy.getTeamAttendance.and.returnValue(of([]));
    component.ngOnInit();
    expect(component.isPM).toBeTrue();
    expect(component.isGMAdmin).toBeFalse();
  });

  it('should update page title and subtitle for PM', () => {
    setupAuth(['ROLE_PROJECT_MANAGER']);
    attendanceSpy.getTeamAttendance.and.returnValue(of([]));
    component.ngOnInit();
    expect(component.pageTitle).toBe('My Team Attendance');
    expect(component.pageSubtitle).toContain('team members');
  });

  // ── Data loading ──────────────────────────────────────────────────────────

  it('should call getAllAttendance for ADMIN on init', () => {
    expect(attendanceSpy.getAllAttendance).toHaveBeenCalled();
  });

  it('should call getTeamAttendance for PM on init', () => {
    setupAuth(['ROLE_PROJECT_MANAGER']);
    attendanceSpy.getTeamAttendance.and.returnValue(of([]));
    component.ngOnInit();
    expect(attendanceSpy.getTeamAttendance).toHaveBeenCalled();
  });

  it('should pass month and year filter when selectedMonth is set', () => {
    component.selectedMonth = 5;
    component.selectedYear  = 2026;
    component.load();
    expect(attendanceSpy.getAllAttendance).toHaveBeenCalledWith(
      jasmine.objectContaining({ month: 5, year: 2026 })
    );
  });

  it('should not include month in filter when selectedMonth is null', () => {
    component.selectedMonth = null;
    component.load();
    const args = attendanceSpy.getAllAttendance.calls.mostRecent().args[0]!;
expect(args.month).toBeUndefined();
  });

  it('should populate allRecords and records after load', () => {
    const data = makeRecords(3);
    attendanceSpy.getAllAttendance.and.returnValue(of(data));
    component.load();
    expect(component.allRecords.length).toBe(3);
    expect(component.records.length).toBe(3);
  });

  it('should set loading=false after load', () => {
    expect(component.loading).toBeFalse();
  });

  it('should set error message on load failure', () => {
    attendanceSpy.getAllAttendance.and.returnValue(
      throwError(() => ({ error: { message: 'Server error' } }))
    );
    component.load();
    expect(component.error).toBe('Server error');
    expect(component.loading).toBeFalse();
  });

  it('should fall back to default error message when error has no message', () => {
    attendanceSpy.getAllAttendance.and.returnValue(throwError(() => ({})));
    component.load();
    expect(component.error).toBe('Failed to load attendance records.');
  });

  it('should clear searchEmail on load', () => {
    component.searchEmail = 'test';
    component.load();
    expect(component.searchEmail).toBe('');
  });

  it('should reset to page 0 on load', () => {
    component.currentPage = 3;
    attendanceSpy.getAllAttendance.and.returnValue(of(makeRecords(5)));
    component.load();
    expect(component.currentPage).toBe(0);
  });

  // ── Search ────────────────────────────────────────────────────────────────

 // ✅ after
it('should filter records by email', () => {
  component.allRecords = [
    makeRecord({ userEmail: 'alice@test.com', userFullName: 'Alice Smith' }),
    makeRecord({ userEmail: 'bob@test.com',   userFullName: 'Bob Jones'   }),
  ];
  component.records = [...component.allRecords];
  component.searchEmail = 'alice';
  component.onEmailSearch();
  expect(component.records.length).toBe(1);
  expect(component.records[0].userEmail).toBe('alice@test.com');
});

  it('should filter records by full name', () => {
    component.allRecords = [
      makeRecord({ userFullName: 'Alice Smith' }),
      makeRecord({ userFullName: 'Bob Jones'   }),
    ];
    component.records = [...component.allRecords];
    component.searchEmail = 'alice';
    component.onEmailSearch();
    expect(component.records.length).toBe(1);
  });

  it('should show all records when search is empty', () => {
    component.allRecords = makeRecords(5);
    component.records    = [];
    component.searchEmail = '';
    component.onEmailSearch();
    expect(component.records.length).toBe(5);
  });

  it('should reset to page 0 after search', () => {
    component.allRecords  = makeRecords(3);
    component.currentPage = 2;
    component.searchEmail = 'user0';
    component.onEmailSearch();
    expect(component.currentPage).toBe(0);
  });

  it('should restore all records and reset page on clearSearch()', () => {
    component.allRecords  = makeRecords(5);
    component.records     = makeRecords(1);
    component.searchEmail = 'something';
    component.currentPage = 2;
    component.clearSearch();
    expect(component.searchEmail).toBe('');
    expect(component.records.length).toBe(5);
    expect(component.currentPage).toBe(0);
  });

  // ── Pagination ────────────────────────────────────────────────────────────

  it('should slice records correctly for the first page', () => {
    attendanceSpy.getAllAttendance.and.returnValue(of(makeRecords(25)));
    component.load();
    expect(component.pagedRecords.length).toBe(10);
    expect(component.pageStart).toBe(1);
    expect(component.pageEnd).toBe(10);
  });

  it('should update paged records on page change', () => {
    component.records     = makeRecords(25);
    component.currentSize = 10;
    const event = { pageIndex: 1, pageSize: 10 } as PageEvent;
    component.onPageChange(event);
    expect(component.currentPage).toBe(1);
    expect(component.pagedRecords.length).toBe(10);
    expect(component.pageStart).toBe(11);
    expect(component.pageEnd).toBe(20);
  });

  it('should handle last page with fewer records', () => {
    component.records     = makeRecords(23);
    component.currentSize = 10;
    const event = { pageIndex: 2, pageSize: 10 } as PageEvent;
    component.onPageChange(event);
    expect(component.pagedRecords.length).toBe(3);
    expect(component.pageEnd).toBe(23);
  });

  it('should set pageStart=0 when records are empty', () => {
    attendanceSpy.getAllAttendance.and.returnValue(of([]));
    component.load();
    expect(component.pageStart).toBe(0);
    expect(component.pageEnd).toBe(0);
  });

  // ── statusClass ───────────────────────────────────────────────────────────

  it('should return correct CSS class for each status', () => {
    expect(component.statusClass('PRESENT')).toBe('status-present');
    expect(component.statusClass('LATE')).toBe('status-late');
    expect(component.statusClass('EARLY_DEPARTURE')).toBe('status-early-departure');
    expect(component.statusClass('ABSENT')).toBe('status-absent');
    expect(component.statusClass('HALF_DAY')).toBe('status-half-day');
    expect(component.statusClass('UNKNOWN')).toBe('');
  });

  it('should handle lowercase status in statusClass', () => {
    expect(component.statusClass('present')).toBe('status-present');
  });

  // ── formatStatus ──────────────────────────────────────────────────────────

  it('should format status string correctly', () => {
    expect(component.formatStatus('EARLY_DEPARTURE')).toBe('Early Departure');
    expect(component.formatStatus('HALF_DAY')).toBe('Half Day');
    expect(component.formatStatus('PRESENT')).toBe('Present');
  });

  it('should return empty string for falsy status', () => {
    expect(component.formatStatus('')).toBe('');
    expect(component.formatStatus(null as any)).toBe('');
  });

  // ── initials ──────────────────────────────────────────────────────────────

  it('should return correct initials for a full name', () => {
    expect(component.initials('Alice Smith')).toBe('AS');
    expect(component.initials('Bob')).toBe('B');
    expect(component.initials('Mary Jane Watson')).toBe('MJ');
  });

  it('should return "?" for empty name', () => {
    expect(component.initials('')).toBe('?');
    expect(component.initials(null as any)).toBe('?');
  });

  // ── avatarColor ───────────────────────────────────────────────────────────

  it('should return a colour string for a given name', () => {
    const colour = component.avatarColor('Alice Smith');
    expect(typeof colour).toBe('string');
    expect(colour.startsWith('#')).toBeTrue();
  });

  it('should return the first palette colour for empty name', () => {
    expect(component.avatarColor('')).toBe('#1e3a5f');
  });

  it('should return the same colour for the same name', () => {
    expect(component.avatarColor('Test User')).toBe(component.avatarColor('Test User'));
  });

  // ── onFilterChange ────────────────────────────────────────────────────────

  it('should reload data on filter change', () => {
    attendanceSpy.getAllAttendance.calls.reset();
    component.onFilterChange();
    expect(attendanceSpy.getAllAttendance).toHaveBeenCalled();
  });

  // ── ngOnDestroy ───────────────────────────────────────────────────────────

  it('should complete destroy$ on ngOnDestroy', () => {
    const nextSpy = spyOn((component as any).destroy$, 'next').and.callThrough();
    component.ngOnDestroy();
    expect(nextSpy).toHaveBeenCalled();
  });
});