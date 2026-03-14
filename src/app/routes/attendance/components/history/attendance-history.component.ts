import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { AttendanceService } from '../../services/attendance.service';
import { AttendanceRecord, AttendanceFilter } from '../../models/attendance.model';

@Component({
  selector: 'app-attendance-history',
  templateUrl: './attendance-history.component.html',
  styleUrls: ['./attendance-history.component.scss'],
})
export class AttendanceHistoryComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns = ['date', 'checkIn', 'checkOut', 'status', 'workDuration', 'overtimeHours'];
  dataSource = new MatTableDataSource<AttendanceRecord>();
  loading = true;

  selectedMonth: number | null = null;
  selectedYear = new Date().getFullYear();

  months = [
    { value: 1,  label: 'January'  }, { value: 2,  label: 'February' },
    { value: 3,  label: 'March'    }, { value: 4,  label: 'April'    },
    { value: 5,  label: 'May'      }, { value: 6,  label: 'June'     },
    { value: 7,  label: 'July'     }, { value: 8,  label: 'August'   },
    { value: 9,  label: 'September'}, { value: 10, label: 'October'  },
    { value: 11, label: 'November' }, { value: 12, label: 'December' },
  ];

  years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  constructor(private attendanceService: AttendanceService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    const filter: AttendanceFilter = { year: this.selectedYear };
    if (this.selectedMonth) filter.month = this.selectedMonth;

    this.attendanceService.getMyAttendance(filter).subscribe({
      next: (data) => {
        this.dataSource.data = data;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  onFilterChange(): void { this.load(); }

  statusColor(status: string): string {
    return { PRESENT: 'primary', LATE: 'accent', ABSENT: 'warn', HALF_DAY: '' }[status] || '';
  }
}