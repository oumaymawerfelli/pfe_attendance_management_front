import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { of, throwError } from 'rxjs';

import { AdminLeavesComponent } from './admin-leaves.component';
import { LeaveService } from '../../services/leave.service';
import { AuthService } from '@core/authentication/auth.service';
import { LeaveStatus, LeaveType } from '../../models/leave.model';

// ── Mock data ─────────────────────────────────────────────────────────────────

const makeLeave = (overrides: any = {}) => ({
  id:             1,
  userFullName:   'Alice Smith',
  userDepartment: 'Engineering',
  leaveType:      'ANNUAL',
  status:         LeaveStatus.PENDING,
  documentPath:   null,
  ...overrides,
});

const mockLeaves = [
  makeLeave({ id: 1, userFullName: 'Alice Smith', status: LeaveStatus.PENDING    }),
  makeLeave({ id: 2, userFullName: 'Bob Jones',   status: LeaveStatus.APPROVED   }),
  makeLeave({ id: 3, userFullName: 'Carol White', status: LeaveStatus.REJECTED   }),
];

describe('AdminLeavesComponent', () => {
  let component: AdminLeavesComponent;
  let fixture:   ComponentFixture<AdminLeavesComponent>;
  let leaveSpy:  jasmine.SpyObj<LeaveService>;
  let authSpy:   jasmine.SpyObj<AuthService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let snackSpy:  jasmine.SpyObj<MatSnackBar>;

  function setupAuth(roles: string[]) {
    authSpy.user.and.returnValue(of({ roles } as any));
  }

  beforeEach(async () => {
    leaveSpy = jasmine.createSpyObj('LeaveService', [
      'getAllLeaves', 'getPendingLeaves',
      'getTeamAllLeaves', 'getTeamPendingLeaves',
      'openDocument',
    ]);
    leaveSpy.getAllLeaves.and.returnValue(of(mockLeaves as any));
    leaveSpy.getPendingLeaves.and.returnValue(of([mockLeaves[0]] as any));
    leaveSpy.getTeamAllLeaves.and.returnValue(of(mockLeaves as any));
    leaveSpy.getTeamPendingLeaves.and.returnValue(of([mockLeaves[0]] as any));

    authSpy  = jasmine.createSpyObj('AuthService', ['user']);
    setupAuth(['ROLE_ADMIN']);

    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    dialogSpy.open.and.returnValue({ afterClosed: () => of(null) } as any);

    snackSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      declarations: [AdminLeavesComponent],
      schemas:      [NO_ERRORS_SCHEMA],
      providers: [
        { provide: LeaveService,  useValue: leaveSpy  },
        { provide: AuthService,   useValue: authSpy   },
        { provide: MatDialog,     useValue: dialogSpy },
        { provide: MatSnackBar,   useValue: snackSpy  },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(AdminLeavesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  // ── Creation ──────────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── Role resolution ───────────────────────────────────────────────────────

  it('should set isGMAdmin=true and isPM=false for ADMIN', () => {
    expect(component.isGMAdmin).toBeTrue();
    expect(component.isPM).toBeFalse();
  });

  it('should set isPM=true for PROJECT_MANAGER', () => {
    setupAuth(['ROLE_PROJECT_MANAGER']);
    component.ngOnInit();
    expect(component.isPM).toBeTrue();
    expect(component.isGMAdmin).toBeFalse();
  });

  it('should set page title to "Team Leave Requests" for PM', () => {
    setupAuth(['ROLE_PROJECT_MANAGER']);
    component.ngOnInit();
    expect(component.pageTitle).toBe('Team Leave Requests');
    expect(component.pageSubtitle).toContain('team');
  });

  it('should set default page title for non-PM', () => {
    expect(component.pageTitle).toBe('My Leaves');
  });

  // ── load() ────────────────────────────────────────────────────────────────

  it('should call getAllLeaves for admin with ALL filter', () => {
    expect(leaveSpy.getAllLeaves).toHaveBeenCalled();
  });

  it('should call getPendingLeaves when filter is PENDING', () => {
    component.activeFilter = 'PENDING';
    component.load();
    expect(leaveSpy.getPendingLeaves).toHaveBeenCalled();
  });

  it('should call getTeamAllLeaves for PM with ALL filter', () => {
    setupAuth(['ROLE_PROJECT_MANAGER']);
    component.ngOnInit();
    expect(leaveSpy.getTeamAllLeaves).toHaveBeenCalled();
  });

  it('should call getTeamPendingLeaves for PM with PENDING filter', () => {
    setupAuth(['ROLE_PROJECT_MANAGER']);
    component.ngOnInit();
    component.activeFilter = 'PENDING';
    component.load();
    expect(leaveSpy.getTeamPendingLeaves).toHaveBeenCalled();
  });

  it('should populate dataSource after load', () => {
    expect(component.dataSource.data.length).toBe(3);
  });

  it('should set loading=false after load', () => {
    expect(component.loading).toBeFalse();
  });

  it('should reset pageIndex to 0 on load', () => {
    component.pageIndex = 2;
    component.load();
    expect(component.pageIndex).toBe(0);
  });

  it('should set loading=false on error', () => {
    leaveSpy.getAllLeaves.and.returnValue(throwError(() => new Error('fail')));
    component.load();
    expect(component.loading).toBeFalse();
  });

  // ── setFilter ─────────────────────────────────────────────────────────────

  it('should update activeFilter and reload', () => {
    leaveSpy.getPendingLeaves.calls.reset();
    component.setFilter('PENDING');
    expect(component.activeFilter).toBe('PENDING');
    expect(leaveSpy.getPendingLeaves).toHaveBeenCalled();
  });

  it('should clear searchText on setFilter', () => {
    component.searchText = 'something';
    component.setFilter('ALL');
    expect(component.searchText).toBe('');
  });

  // ── search ────────────────────────────────────────────────────────────────

  it('hasSearch should return true when searchText is non-empty', () => {
    component.searchText = 'alice';
    expect(component.hasSearch).toBeTrue();
  });

  it('hasSearch should return false when searchText is empty', () => {
    component.searchText = '';
    expect(component.hasSearch).toBeFalse();
  });

  it('applySearch should filter the dataSource', () => {
    component.searchText = 'alice';
    component.applySearch();
    expect(component.dataSource.filter).toBe('alice');
  });

  it('clearSearch should reset searchText and filter', () => {
    component.searchText = 'alice';
    component.clearSearch();
    expect(component.searchText).toBe('');
    expect(component.dataSource.filter).toBe('');
  });

  // ── Pagination helpers ────────────────────────────────────────────────────

  it('totalFiltered should reflect filteredData length', () => {
    expect(component.totalFiltered).toBe(component.dataSource.filteredData.length);
  });

  it('showingFrom should be 0 when no records', () => {
    component.dataSource.data = [];
    expect(component.showingFrom).toBe(0);
  });

  it('showingFrom should be 1 on first page with records', () => {
    component.pageIndex = 0;
    component.pageSize  = 10;
    expect(component.showingFrom).toBe(1);
  });

  it('showingTo should not exceed totalFiltered', () => {
    component.pageIndex = 0;
    component.pageSize  = 100;
    expect(component.showingTo).toBe(component.totalFiltered);
  });

  it('onPage should update pageSize and pageIndex', () => {
    const event = { pageIndex: 2, pageSize: 25 } as PageEvent;
    component.onPage(event);
    expect(component.pageIndex).toBe(2);
    expect(component.pageSize).toBe(25);
  });

  it('pageNumbers should return all pages when total <= 5', () => {
    component.dataSource.data = mockLeaves as any;
    component.pageSize        = 10;
    component.pageIndex       = 0;
    // 3 records / 10 per page = 1 page
    expect(component.pageNumbers).toEqual([1]);
  });

  it('pageNumbers should return up to 5 pages for large datasets', () => {
    component.dataSource.data = Array.from({ length: 100 }, (_, i) => makeLeave({ id: i })) as any;
    component.pageSize  = 10;
    component.pageIndex = 5; // page 6
    expect(component.pageNumbers.length).toBe(5);
  });

  // ── openDetail ────────────────────────────────────────────────────────────

  it('should open the detail dialog', () => {
    component.openDetail(mockLeaves[0] as any);
    expect(dialogSpy.open).toHaveBeenCalled();
  });

  it('should reload after dialog closes with a result', () => {
    const result = { action: 'approved', leave: mockLeaves[0] };
    dialogSpy.open.and.returnValue({ afterClosed: () => of(result) } as any);
    leaveSpy.getAllLeaves.calls.reset();
    component.openDetail(mockLeaves[0] as any);
    expect(leaveSpy.getAllLeaves).toHaveBeenCalled();
  });

  it('should show snackbar with approved message', () => {
    const result = { action: 'approved', leave: mockLeaves[0] };
    dialogSpy.open.and.returnValue({ afterClosed: () => of(result) } as any);
    component.openDetail(mockLeaves[0] as any);
    expect(snackSpy.open).toHaveBeenCalledWith(
      jasmine.stringContaining('approved'), 'Close', jasmine.any(Object)
    );
  });

  it('should show snackbar with rejected message', () => {
    const result = { action: 'rejected', leave: mockLeaves[0] };
    dialogSpy.open.and.returnValue({ afterClosed: () => of(result) } as any);
    component.openDetail(mockLeaves[0] as any);
    expect(snackSpy.open).toHaveBeenCalledWith(
      jasmine.stringContaining('rejected'), 'Close', jasmine.any(Object)
    );
  });

  it('should not reload when dialog closes with null', () => {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(null) } as any);
    leaveSpy.getAllLeaves.calls.reset();
    component.openDetail(mockLeaves[0] as any);
    expect(leaveSpy.getAllLeaves).not.toHaveBeenCalled();
  });

  // ── hasDocument / viewDocument ────────────────────────────────────────────

  it('hasDocument should return false when documentPath is null', () => {
    expect(component.hasDocument(makeLeave({ documentPath: null }) as any)).toBeFalse();
  });

  it('hasDocument should return true when documentPath is set', () => {
    expect(component.hasDocument(makeLeave({ documentPath: '/files/doc.pdf' }) as any)).toBeTrue();
  });

  it('viewDocument should call openDocument with leave id', () => {
    component.viewDocument(makeLeave({ id: 7 }) as any);
    expect(leaveSpy.openDocument).toHaveBeenCalledWith(7);
  });

  // ── initials ──────────────────────────────────────────────────────────────

  it('should return correct initials', () => {
    expect(component.initials('Alice Smith')).toBe('AS');
    expect(component.initials('Bob')).toBe('B');
    expect(component.initials('Mary Jane Watson')).toBe('MJ');
  });

  // ── avatarColor ───────────────────────────────────────────────────────────

  it('should return a hex color string', () => {
    expect(component.avatarColor('Alice Smith')).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('should return the same color for the same name', () => {
    expect(component.avatarColor('Test')).toBe(component.avatarColor('Test'));
  });

  // ── isPending ─────────────────────────────────────────────────────────────

  it('should return true for pending statuses', () => {
    expect(component.isPending(LeaveStatus.PENDING)).toBeTrue();
    expect(component.isPending(LeaveStatus.PENDING_HR)).toBeTrue();
    expect(component.isPending(LeaveStatus.PENDING_GM)).toBeTrue();
  });

  it('should return false for non-pending statuses', () => {
    expect(component.isPending(LeaveStatus.APPROVED)).toBeFalse();
    expect(component.isPending(LeaveStatus.REJECTED)).toBeFalse();
  });

  // ── typeLabel ─────────────────────────────────────────────────────────────

  it('should return label for known leave type', () => {
    const label = component.typeLabel('ANNUAL' as LeaveType);
    expect(typeof label).toBe('string');
    expect(label.length).toBeGreaterThan(0);
  });

  it('should return raw string for unknown leave type', () => {
    expect(component.typeLabel('CUSTOM_TYPE')).toBe('CUSTOM_TYPE');
  });

  // ── statusLabel / statusClass ─────────────────────────────────────────────

  it('should return label for known status', () => {
    const label = component.statusLabel(LeaveStatus.APPROVED);
    expect(typeof label).toBe('string');
    expect(label.length).toBeGreaterThan(0);
  });

  it('should return raw string for unknown status', () => {
    expect(component.statusLabel('MYSTERY' as any)).toBe('MYSTERY');
  });

  it('should return a color string for known status', () => {
    const color = component.statusClass(LeaveStatus.APPROVED);
    expect(typeof color).toBe('string');
  });

  it('should return "gray" for unknown status', () => {
    expect(component.statusClass('UNKNOWN' as any)).toBe('gray');
  });

  // ── typeChipIcon / typeChipBg / typeChipIconColor ─────────────────────────

  it('typeChipIcon should return correct icon for known types', () => {
    expect(component.typeChipIcon('ANNUAL')).toBe('calendar_today');
    expect(component.typeChipIcon('SICK')).toBe('add');
    expect(component.typeChipIcon('UNPAID')).toBe('money_off');
  });

  it('typeChipIcon should return "event" for unknown type', () => {
    expect(component.typeChipIcon('UNKNOWN')).toBe('event');
  });

  it('typeChipBg should return a hex color', () => {
    expect(component.typeChipBg('ANNUAL')).toMatch(/^#/);
    expect(component.typeChipBg('UNKNOWN')).toMatch(/^#/);
  });

  it('typeChipIconColor should return a hex color', () => {
    expect(component.typeChipIconColor('SICK')).toMatch(/^#/);
    expect(component.typeChipIconColor('UNKNOWN')).toMatch(/^#/);
  });

  // ── ngOnDestroy ───────────────────────────────────────────────────────────

  it('should complete destroy$ on ngOnDestroy', () => {
    const spy = spyOn((component as any).destroy$, 'next').and.callThrough();
    component.ngOnDestroy();
    expect(spy).toHaveBeenCalled();
  });
});