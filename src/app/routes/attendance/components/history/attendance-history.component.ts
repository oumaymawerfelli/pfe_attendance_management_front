import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { AttendanceService } from '../../services/attendance.service';
import { AttendanceRecord } from '../../models/attendance.model';

@Component({
  selector: 'app-attendance-history',
  templateUrl: './attendance-history.component.html',
})
export class AttendanceHistoryComponent implements OnInit, AfterViewInit {
  dataSource = new MatTableDataSource<AttendanceRecord>([]);
  displayedColumns: string[] = [
    'date',
    'checkIn',
    'checkOut',
    'status',
    'workDuration',
    'overtimeHours',
  ];

  selectedMonth: number | null = new Date().getMonth() + 1;
  selectedYear: number = new Date().getFullYear();

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

  years: number[] = [];
  loading = false;

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private attendanceService: AttendanceService) {}

  ngOnInit(): void {
    const current = new Date().getFullYear();
    this.years = Array.from({ length: 5 }, (_, i) => current - i);
    this.loadData();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  onFilterChange(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;

    const filter: { month?: number; year?: number } = { year: this.selectedYear };
    if (this.selectedMonth !== null) {
      filter.month = this.selectedMonth;
    }

    this.attendanceService.getMyAttendance(filter).subscribe({
      next: (data: AttendanceRecord[]) => {
        this.dataSource.data = data;
        this.dataSource.sort = this.sort;
        this.dataSource.paginator = this.paginator;
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Failed to load attendance history:', err);
        this.dataSource.data = [];
        this.loading = false;
      },
    });
  }

  statusColor(status: string): string {
    switch (status?.toUpperCase()) {
      case 'PRESENT':
        return 'primary';
      case 'LATE':
        return 'warn';
      case 'ABSENT':
        return 'accent';
      case 'HALF_DAY':
        return 'accent';
      case 'EARLY_DEPARTURE':
        return 'warn';
      default:
        return '';
    }
  }
}
