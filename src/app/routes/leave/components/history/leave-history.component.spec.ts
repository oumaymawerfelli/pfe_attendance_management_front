import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { of, throwError } from 'rxjs';

import { LeaveHistoryComponent } from './leave-history.component';
import { LeaveService } from '../../services/leave.service';
import { LeaveStatus, LeaveType } from '../../models/leave.model';

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeLeave = (overrides: any = {}) => ({
  id:        1,
  leaveType: 'ANNUAL',
  startDate: '2026-05-01',
  endDate:   '2026-05-05',
  daysCount: 5,
  status:    LeaveStatus.PENDING,
  reason:    'Vacation',
  decidedAt: null,
  ...overrides,
});

const mockLeaves = [
  makeLeave({ id: 1, status: LeaveStatus.PENDING,  leaveType: 'ANNUAL', reason: 'Holiday' }),
  makeLeave({ id: 2, status: LeaveStatus.APPROVED, leaveType: 'SICK',   reason: 'Flu'     }),
  makeLeave({ id: 3, status: LeaveStatus.REJECTED, leaveType: 'UNPAID', reason: 'Personal'}),
  makeLeave({ id: 4, status: LeaveStatus.DRAFT,    leaveType: 'ANNUAL', reason: 'Draft'   }),
];

describe('LeaveHistoryComponent', () => {
  let component: LeaveHistoryComponent;
  let fixture:   ComponentFixture<LeaveHistoryComponent>;
  let leaveSpy:  jasmine.SpyObj<LeaveService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;

  beforeEach(async () => {
    leaveSpy  = jasmine.createSpyObj('LeaveService', ['getMyLeaves']);
    leaveSpy.getMyLeaves.and.returnValue(of(mockLeaves as any));

    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    dialogSpy.open.and.returnValue({} as any);

    await TestBed.configureTestingModule({
      declarations: [LeaveHistoryComponent],
      schemas:      [NO_ERRORS_SCHEMA],
      providers: [
        { provide: LeaveService, useValue: leaveSpy  },
        { provide: MatDialog,    useValue: dialogSpy },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(LeaveHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  // ── Creation & init ───────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call getMyLeaves on init', () => {
    expect(leaveSpy.getMyLeaves).toHaveBeenCalled();
  });

  it('should populate dataSource after load', () => {
    expect(component.dataSource.data.length).toBe(4);
  });

  it('should set loading=false after load', () => {
    expect(component.loading).toBeFalse();
  });

  it('should reset pageIndex to 0 on load', () => {
    component.pageIndex = 3;
    component.refresh();
    expect(component.pageIndex).toBe(0);
  });

  it('should set loading=false on error', () => {
    leaveSpy.getMyLeaves.and.returnValue(throwError(() => new Error('fail')));
    component.refresh();
    expect(component.loading).toBeFalse();
  });

  // ── refresh ───────────────────────────────────────────────────────────────

  it('refresh() should reload data', () => {
    leaveSpy.getMyLeaves.calls.reset();
    component.refresh();
    expect(leaveSpy.getMyLeaves).toHaveBeenCalled();
  });

  // ── setChip / applyFilter ─────────────────────────────────────────────────

  it('should default to ALL chip', () => {
    expect(component.activeChip).toBe('ALL');
  });

  it('setChip should update activeChip and apply filter', () => {
    component.setChip(LeaveStatus.APPROVED);
    expect(component.activeChip).toBe(LeaveStatus.APPROVED);
    expect(component.dataSource.filter).toContain(LeaveStatus.APPROVED);
  });

  it('ALL chip should show all records', () => {
    component.setChip('ALL');
    expect(component.dataSource.filteredData.length).toBe(4);
  });

  it('APPROVED chip should show only approved records', () => {
    component.setChip(LeaveStatus.APPROVED);
    expect(component.dataSource.filteredData.every(r => r.status === LeaveStatus.APPROVED)).toBeTrue();
  });

  it('REJECTED chip should show only rejected records', () => {
    component.setChip(LeaveStatus.REJECTED);
    expect(component.dataSource.filteredData.every(r => r.status === LeaveStatus.REJECTED)).toBeTrue();
  });

  it('DRAFT chip should show only draft records', () => {
    component.setChip(LeaveStatus.DRAFT);
    expect(component.dataSource.filteredData.every(r => r.status === LeaveStatus.DRAFT)).toBeTrue();
  });

  it('PENDING_ANY chip should show all pending-family records', () => {
    component.dataSource.data = [
      makeLeave({ status: LeaveStatus.PENDING           }),
      makeLeave({ status: LeaveStatus.PENDING_HR        }),
      makeLeave({ status: LeaveStatus.PENDING_GM        }),
      makeLeave({ status: LeaveStatus.PENDING_TEAM_LEAD }),
      makeLeave({ status: LeaveStatus.APPROVED          }),
    ] as any;
    component.setChip('PENDING_ANY');
    expect(component.dataSource.filteredData.length).toBe(4);
    expect(component.dataSource.filteredData.some(r => r.status === LeaveStatus.APPROVED)).toBeFalse();
  });

  it('text search should filter by leaveType', () => {
    component.searchText = 'sick';
    component.applyFilter();
    expect(component.dataSource.filteredData.every(r =>
      r.leaveType.toLowerCase().includes('sick') ||
      r.reason.toLowerCase().includes('sick')    ||
      r.status.toLowerCase().includes('sick')
    )).toBeTrue();
  });

  it('text search should filter by reason', () => {
    component.searchText = 'flu';
    component.applyFilter();
    expect(component.dataSource.filteredData.length).toBe(1);
  });

  it('text search combined with chip should AND the filters', () => {
    component.setChip(LeaveStatus.APPROVED);
    component.searchText = 'flu';
    component.applyFilter();
    expect(component.dataSource.filteredData.length).toBe(1);
    expect(component.dataSource.filteredData[0].status).toBe(LeaveStatus.APPROVED);
  });

  // ── clearSearch ───────────────────────────────────────────────────────────

  it('clearSearch should reset searchText and reapply filter', () => {
    component.searchText = 'flu';
    component.applyFilter();
    component.clearSearch();
    expect(component.searchText).toBe('');
    expect(component.dataSource.filteredData.length).toBe(4);
  });

  // ── hasSearch / hasActiveFilter ───────────────────────────────────────────

  it('hasSearch should be true when searchText is non-empty', () => {
    component.searchText = 'test';
    expect(component.hasSearch).toBeTrue();
  });

  it('hasSearch should be false when searchText is empty', () => {
    component.searchText = '';
    expect(component.hasSearch).toBeFalse();
  });

  it('hasActiveFilter should be true when chip is not ALL', () => {
    component.activeChip = LeaveStatus.APPROVED;
    expect(component.hasActiveFilter).toBeTrue();
  });

  it('hasActiveFilter should be true when searchText is set', () => {
    component.searchText = 'x';
    expect(component.hasActiveFilter).toBeTrue();
  });

  it('hasActiveFilter should be false when both are default', () => {
    component.searchText = '';
    component.activeChip = 'ALL';
    expect(component.hasActiveFilter).toBeFalse();
  });

  // ── Pagination ────────────────────────────────────────────────────────────

  it('onPage should update pageSize and pageIndex', () => {
    component.onPage({ pageIndex: 1, pageSize: 10 } as PageEvent);
    expect(component.pageIndex).toBe(1);
    expect(component.pageSize).toBe(10);
  });

  it('totalFiltered should match filteredData length', () => {
    expect(component.totalFiltered).toBe(component.dataSource.filteredData.length);
  });

  it('showingFrom should be 0 when no records', () => {
    component.dataSource.data = [];
    expect(component.showingFrom).toBe(0);
  });

  it('showingFrom should be 1 on first page', () => {
    component.pageIndex = 0;
    component.pageSize  = 10;
    expect(component.showingFrom).toBe(1);
  });

  it('showingTo should not exceed totalFiltered', () => {
    component.pageIndex = 0;
    component.pageSize  = 100;
    expect(component.showingTo).toBe(component.totalFiltered);
  });

  it('pageNumbers should return all pages when total <= 5', () => {
    component.pageSize  = 10;
    component.pageIndex = 0;
    // 4 records → 1 page
    expect(component.pageNumbers).toEqual([1]);
  });

  it('pageNumbers should return 5 pages for large datasets', () => {
    component.dataSource.data = Array.from({ length: 100 }, (_, i) => makeLeave({ id: i })) as any;
    component.setChip('ALL');
    component.pageSize  = 5;
    component.pageIndex = 5;
    expect(component.pageNumbers.length).toBe(5);
  });

  // ── openDetail ────────────────────────────────────────────────────────────

  it('should open detail dialog with view mode', () => {
    component.openDetail(mockLeaves[0] );
    expect(dialogSpy.open).toHaveBeenCalledWith(
      jasmine.any(Function),
      jasmine.objectContaining({ data: jasmine.objectContaining({ mode: 'view' }) })
    );
  });

  it('should pass the leave record to the dialog', () => {
    component.openDetail(mockLeaves[0] );
 const args = dialogSpy.open.calls.mostRecent().args[1] as any;
expect(args?.data?.leave).toEqual(mockLeaves[0] );
  });

  // ── typeLabel ─────────────────────────────────────────────────────────────

  it('should return a label for known leave types', () => {
    const label = component.typeLabel('ANNUAL' as LeaveType);
    expect(typeof label).toBe('string');
    expect(label.length).toBeGreaterThan(0);
  });

  it('should return the raw string for unknown type', () => {
    expect(component.typeLabel('CUSTOM')).toBe('CUSTOM');
  });

  // ── typeIcon ──────────────────────────────────────────────────────────────

  it('should return correct icon for known leave types', () => {
    expect(component.typeIcon('ANNUAL')).toBe('beach_access');
    expect(component.typeIcon('SICK')).toBe('favorite');
    expect(component.typeIcon('UNPAID')).toBe('shopping_bag');
  });

  it('should return "event" for unknown type', () => {
    expect(component.typeIcon('CUSTOM')).toBe('event');
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
    expect(typeof component.statusClass(LeaveStatus.APPROVED)).toBe('string');
  });

  it('should return "gray" for unknown status', () => {
    expect(component.statusClass('UNKNOWN' as any)).toBe('gray');
  });

  // ── isPending ─────────────────────────────────────────────────────────────

  it('should return true for all pending-family statuses', () => {
    expect(component.isPending(LeaveStatus.PENDING)).toBeTrue();
    expect(component.isPending(LeaveStatus.PENDING_HR)).toBeTrue();
    expect(component.isPending(LeaveStatus.PENDING_GM)).toBeTrue();
    expect(component.isPending(LeaveStatus.PENDING_TEAM_LEAD)).toBeTrue();
  });

  it('should return false for non-pending statuses', () => {
    expect(component.isPending(LeaveStatus.APPROVED)).toBeFalse();
    expect(component.isPending(LeaveStatus.REJECTED)).toBeFalse();
    expect(component.isPending(LeaveStatus.DRAFT)).toBeFalse();
  });
});