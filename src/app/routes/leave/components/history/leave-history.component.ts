import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { LeaveService } from '../../services/leave.service';
import { LeaveRecord } from '../../models/leave.model';

@Component({
  selector: 'app-leave-history',
  templateUrl: './leave-history.component.html',
  styleUrls: ['./leave-history.component.scss'],
})
export class LeaveHistoryComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns = ['leaveType', 'startDate', 'endDate', 'daysCount', 'reason', 'status', 'decidedAt'];
  dataSource = new MatTableDataSource<LeaveRecord>();
  loading = true;

  constructor(private leaveService: LeaveService) {}

  ngOnInit(): void {
    this.leaveService.getMyLeaves().subscribe({
      next: (data) => {
        this.dataSource.data = data;
        this.dataSource.paginator = this.paginator;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  statusColor(status: string): string {
    return { APPROVED: 'primary', PENDING: 'accent', REJECTED: 'warn' }[status] || '';
  }

  typeIcon(type: string): string {
    return { ANNUAL: 'beach_access', SICK: 'local_hospital', UNPAID: 'money_off' }[type] || 'event';
  }
}