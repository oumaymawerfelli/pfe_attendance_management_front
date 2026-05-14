import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';

import { LeaveService } from '../../services/leave.service';
import {
  LeaveRecord,
  LeaveStatus,
  LeaveType,
  LEAVE_STATUS_CONFIG,
  LEAVE_TYPE_OPTIONS,
} from '../../models/leave.model';
import { LeaveDetailDialogComponent } from '../leave-detail-dialog/leave-detail-dialog.component';

type ChipValue = 'ALL' | LeaveStatus | 'PENDING_ANY';

@Component({
  selector: 'app-leave-history',
  templateUrl: './leave-history.component.html',
  styleUrls: ['./leave-history.component.scss'],
})
export class LeaveHistoryComponent implements OnInit {

  @ViewChild(MatPaginator, { static: false }) paginator!: MatPaginator;
  @ViewChild(MatSort,      { static: false }) sort!: MatSort;

  readonly displayedColumns = [
    'leaveType', 'startDate', 'endDate', 'daysCount', 'status', 'decidedAt', 'actions',
  ];

  dataSource = new MatTableDataSource<LeaveRecord>();
  loading    = true;

  // Filter
  searchText  = '';
  activeChip: ChipValue = 'ALL';
  searchFocused = false;

  readonly statusChips: { label: string; value: ChipValue }[] = [
    { label: 'All',      value: 'ALL'         },
    { label: 'Draft',    value: LeaveStatus.DRAFT    },
    { label: 'Pending',  value: 'PENDING_ANY'  },
    { label: 'Approved', value: LeaveStatus.APPROVED },
    { label: 'Rejected', value: LeaveStatus.REJECTED },
  ];

  // Pagination
  pageSize  = 5;
  pageIndex = 0;
  readonly pageSizeOptions = [5, 10, 25];

  // Expose to template
  readonly LeaveStatus      = LeaveStatus;
  readonly statusConfig     = LEAVE_STATUS_CONFIG;
  readonly leaveTypeOptions = LEAVE_TYPE_OPTIONS;

  private readonly PENDING_STATUSES = new Set<LeaveStatus>([
    LeaveStatus.PENDING,
    LeaveStatus.PENDING_TEAM_LEAD,
    LeaveStatus.PENDING_HR,
    LeaveStatus.PENDING_GM,
  ]);

  constructor(
    private leaveService: LeaveService,
    private dialog:       MatDialog,
  ) {}

  ngOnInit(): void {
    this.setupFilter();
    this.load();
  }

  // ── Data ──────────────────────────────────────────────────────────────────

  refresh(): void { this.load(); }

  private load(): void {
    this.loading = true;
    this.leaveService.getMyLeaves().subscribe({
      next: data => {
        this.dataSource.data = data;
        this.pageIndex = 0;
        setTimeout(() => {
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort      = this.sort;
        });
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  // ── Filter ────────────────────────────────────────────────────────────────

  private setupFilter(): void {
    this.dataSource.filterPredicate = (row: LeaveRecord, raw: string) => {
      const f = JSON.parse(raw) as { text: string; chip: ChipValue };

      const textMatch = !f.text ||
        row.leaveType.toLowerCase().includes(f.text) ||
        row.reason.toLowerCase().includes(f.text)    ||
        row.status.toLowerCase().includes(f.text);

      const chipMatch =
        f.chip === 'ALL'        ? true :
        f.chip === 'PENDING_ANY'? this.PENDING_STATUSES.has(row.status) :
                                  row.status === f.chip;

      return textMatch && chipMatch;
    };
  }

  applyFilter(): void {
    this.dataSource.filter = JSON.stringify({
      text: this.searchText.toLowerCase().trim(),
      chip: this.activeChip,
    });
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
    this.pageIndex = 0;
  }

  setChip(value: ChipValue): void { this.activeChip = value; this.applyFilter(); }

  clearSearch(): void { this.searchText = ''; this.applyFilter(); }

  get hasSearch(): boolean { return this.searchText.length > 0; }

  get hasActiveFilter(): boolean {
    return this.searchText.length > 0 || this.activeChip !== 'ALL';
  }

  // ── Pagination ────────────────────────────────────────────────────────────

  onPage(event: PageEvent): void {
    this.pageSize  = event.pageSize;
    this.pageIndex = event.pageIndex;
  }

  get totalFiltered(): number { return this.dataSource.filteredData.length; }

  get showingFrom(): number {
    return this.totalFiltered === 0 ? 0 : this.pageIndex * this.pageSize + 1;
  }

  get showingTo(): number {
    return Math.min((this.pageIndex + 1) * this.pageSize, this.totalFiltered);
  }

  get pageNumbers(): number[] {
    const total = Math.ceil(this.totalFiltered / this.pageSize);
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    const cur   = this.pageIndex + 1;
    const start = Math.max(1, Math.min(cur - 2, total - 4));
    return Array.from({ length: 5 }, (_, i) => start + i).filter(p => p <= total);
  }

  // ── Dialog ────────────────────────────────────────────────────────────────

  openDetail(row: LeaveRecord): void {
    this.dialog.open(LeaveDetailDialogComponent, {
      width:      '580px',
      maxHeight:  '90vh',
      panelClass: 'leave-detail-panel',
      data:       { leave: row, mode: 'view', isPM: false },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  typeLabel(type: LeaveType | string): string {
    return this.leaveTypeOptions.find(o => o.type === type)?.label ?? String(type);
  }

  typeIcon(type: LeaveType | string): string {
    const icons: Record<string, string> = {
      ANNUAL: 'beach_access',
      SICK:   'favorite',
      UNPAID: 'shopping_bag',
    };
    return icons[String(type)] ?? 'event';
  }

  statusClass(status: LeaveStatus | string): string {
    return this.statusConfig[status as LeaveStatus]?.color ?? 'gray';
  }

  statusLabel(status: LeaveStatus | string): string {
    return this.statusConfig[status as LeaveStatus]?.label ?? String(status);
  }

  isPending(status: LeaveStatus | string): boolean {
    return this.PENDING_STATUSES.has(status as LeaveStatus);
  }
}