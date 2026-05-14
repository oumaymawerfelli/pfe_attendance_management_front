import {
  Component, OnInit, AfterViewInit,
  OnDestroy, ChangeDetectorRef,
} from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { AuthService } from '@core/authentication';
import { DashboardApiService, DashboardStats } from './dashboard.service';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  currentUser: any = null;
  isAdmin          = false;
  loading          = true;

  kpis = [
    { label: 'Total employees', value: '—', sub: 'active' },
    { label: 'New hires',       value: '—', sub: 'this month' },
    { label: 'Departments',     value: '—', sub: 'in the company' },
    { label: 'Largest dept',    value: '—', sub: 'by headcount' },
  ];

  period             = 'day';
  selectedDepartment = 'ALL';
  selectedDate: Date | null = null;
  today = new Date();

  onPeriodChange(value: string): void {
    this.period       = value;
    this.selectedDate = null;
    this.cdr.markForCheck();
  }

  onDepartmentChange(value: string): void {
    this.selectedDepartment = value;
    this.cdr.markForCheck();
  }

  onDateChange(date: Date | null): void {
    this.selectedDate = date;
    this.cdr.markForCheck();
  }

  clearDate(): void {
    this.selectedDate = null;
    this.cdr.markForCheck();
  }

  deptLabels: string[] = [];
  deptData:   number[] = [];
  deptColors = [
    '#378ADD', '#7F77DD', '#1D9E75',
    '#BA7517', '#D85A30', '#E24B4A',
    '#0F6E56', '#854F0B', '#993556',
  ];

  private charts: Chart[] = [];

  constructor(
    private auth:    AuthService,
    private dashApi: DashboardApiService,
    private cdr:     ChangeDetectorRef,
  ) {}

  get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  get deptTotal(): number {
    return this.deptData.reduce((a, b) => a + b, 0);
  }

  get avgTeamSize(): string {
    if (!this.deptLabels.length) return '—';
    return (this.deptTotal / this.deptLabels.length).toFixed(1);
  }

  deptPercent(count: number): string {
    const total = this.deptTotal;
    if (total === 0) return '0%';
    return Math.round((count / total) * 100) + '%';
  }

  ngOnInit(): void {
    this.auth.user().subscribe((user: any) => {
      this.currentUser = user;
      const roles: string[] = Array.isArray(user?.roles)
        ? user.roles.map((r: any) => (typeof r === 'string' ? r : r?.name ?? ''))
        : [];
      this.isAdmin = roles.some((r: string) =>
        ['ADMIN', 'GENERAL_MANAGER', 'ROLE_ADMIN', 'ROLE_GENERAL_MANAGER'].includes(r),
      );
      if (this.isAdmin) this.loadStats();
      else this.loading = false;
      this.cdr.markForCheck();
    });
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.charts.forEach(c => c.destroy());
  }

  private loadStats(): void {
    this.loading = true;
    this.dashApi.getStats().subscribe({
      next: (stats: DashboardStats) => {
        this.kpis[0].value = String(stats.totalEmployees);
        this.kpis[1].value = String(stats.newHiresThisMonth);
        this.kpis[2].value = String(stats.byDepartment.length);

        const largest = stats.byDepartment[0];
        this.kpis[3].value = largest
          ? `${largest.department} (${largest.count})`
          : '—';

        this.deptLabels = stats.byDepartment.map(d => d.department);
        this.deptData   = stats.byDepartment.map(d => d.count);

        this.loading = false;
        this.cdr.markForCheck();
        setTimeout(() => this.buildDonutChart(), 0);
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private buildDonutChart(): void {
    this.charts.forEach(c => c.destroy());
    this.charts = [];

    const canvas = document.getElementById('donutChart') as HTMLCanvasElement;
    if (!canvas || !this.deptData.length) return;

    const total = this.deptTotal;

    const centerTextPlugin = {
      id: 'centerText',
      afterDraw: (chart: any) => {
        const { ctx, chartArea: { left, right, top, bottom } } = chart;
        const cx = (left + right) / 2;
        const cy = (top + bottom) / 2;
        ctx.save();
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.font         = '700 32px Inter, sans-serif';
        ctx.fillStyle    = '#1e3a5f';
        ctx.fillText(String(total), cx, cy - 14);
        ctx.font         = '400 13px Inter, sans-serif';
        ctx.fillStyle    = 'rgba(30,58,95,0.45)';
        ctx.fillText('Employees', cx, cy + 8);
        // New hires sub-line
        ctx.font         = '600 11px Inter, sans-serif';
        ctx.fillStyle    = '#ea580c';
        ctx.fillText(`↑ +${this.kpis[1].value} this month`, cx, cy + 26);
        ctx.restore();
      },
    };

    const chart = new Chart(canvas, {
      type: 'doughnut',
      plugins: [centerTextPlugin],
      data: {
        labels: this.deptLabels,
        datasets: [{
          data:            this.deptData,
          backgroundColor: this.deptColors.slice(0, this.deptData.length),
          borderWidth:     3,
          borderColor:     '#ffffff',
          hoverOffset:     6,
        }],
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        cutout:              '70%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const val = ctx.raw as number;
                const pct = Math.round((val / total) * 100);
                return ` ${ctx.label}: ${val} (${pct}%)`;
              },
            },
          },
        },
      },
    });
    this.charts.push(chart);
  }
}