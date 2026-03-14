import { Component, OnInit } from '@angular/core';
import { AttendanceService } from '../../services/attendance.service';
import { AttendanceSummary, AttendanceFilter } from '../../models/attendance.model';

@Component({
  selector: 'app-attendance-dashboard',
  templateUrl: './attendance-dashboard.component.html',
  styleUrls: ['./attendance-dashboard.component.scss'],
})
export class AttendanceDashboardComponent implements OnInit {
  summary: AttendanceSummary | null = null;
  loading = true;
  checkingOut = false;
  checkOutDone = false;

  selectedMonth = new Date().getMonth() + 1;
  selectedYear  = new Date().getFullYear();

  months = [
    { value: 1,  label: 'January'  }, { value: 2,  label: 'February' },
    { value: 3,  label: 'March'    }, { value: 4,  label: 'April'    },
    { value: 5,  label: 'May'      }, { value: 6,  label: 'June'     },
    { value: 7,  label: 'July'     }, { value: 8,  label: 'August'   },
    { value: 9,  label: 'September'}, { value: 10, label: 'October'  },
    { value: 11, label: 'November' }, { value: 12, label: 'December' },
  ];

  years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  chartData: { name: string; value: number }[] = [];
  colorScheme: any = { domain: ['#5C6BC0', '#EF5350'] };
  view: [number, number] = [700, 280];

  constructor(private attendanceService: AttendanceService) {}

  ngOnInit(): void {
    this.loadSummary();
  }

  loadSummary(): void {
    this.loading = true;
    const filter: AttendanceFilter = {
      month: this.selectedMonth,
      year: this.selectedYear,
    };

    this.attendanceService.getMySummary(filter).subscribe({
      next: (data) => {
        this.summary = data;
        this.chartData = data.dailyHours.map(d => ({
          name: d.day,
          value: d.workedHours,
        }));
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  onFilterChange(): void {
    this.loadSummary();
  }

  checkOut(): void {
    this.checkingOut = true;
    this.attendanceService.checkOut().subscribe({
      next: () => {
        this.checkingOut = false;
        this.checkOutDone = true;
        this.loadSummary();
      },
      error: () => { this.checkingOut = false; },
    });
  }
}