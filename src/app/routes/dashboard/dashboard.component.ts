import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
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
  isAdmin = false;
  loading = true;
  today = new Date();

  kpis = [
    { label: 'Total employees', value: '—', sub: 'active' },
    { label: 'New hires', value: '—', sub: 'this month' },
    { label: 'Departments', value: '—', sub: 'in the company' },
    { label: 'Largest dept', value: '—', sub: 'by headcount' },
  ];

  deptLabels: string[] = [];
  deptData: number[] = [];
  deptColors = [
    '#378ADD',
    '#7F77DD',
    '#1D9E75',
    '#BA7517',
    '#D85A30',
    '#E24B4A',
    '#0F6E56',
    '#854F0B',
    '#993556',
  ];

  private charts: Chart[] = [];

  constructor(
    private auth: AuthService,
    private dashApi: DashboardApiService,
    private cdr: ChangeDetectorRef
  ) {}

  get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  ngOnInit(): void {
    this.auth.user().subscribe((user: any) => {
      this.currentUser = user;
      const roles: string[] = Array.isArray(user?.roles)
        ? user.roles.map((r: any) => (typeof r === 'string' ? r : r?.name ?? ''))
        : [];
      this.isAdmin = roles.some((r: string) =>
        ['ADMIN', 'GENERAL_MANAGER', 'ROLE_ADMIN', 'ROLE_GENERAL_MANAGER'].includes(r)
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
        // ── KPI cards ──────────────────────────────────
        this.kpis[0].value = String(stats.totalEmployees);
        this.kpis[1].value = String(stats.newHiresThisMonth);
        this.kpis[2].value = String(stats.byDepartment.length);

        const largest = stats.byDepartment[0];
        this.kpis[3].value = largest ? `${largest.department} (${largest.count})` : '—';

        // ── Donut data ─────────────────────────────────
        this.deptLabels = stats.byDepartment.map(d => d.department);
        this.deptData = stats.byDepartment.map(d => d.count);

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

    const chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: this.deptLabels,
        datasets: [
          {
            data: this.deptData,
            backgroundColor: this.deptColors.slice(0, this.deptData.length),
            borderWidth: 2,
            borderColor: '#0c1018',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: { legend: { display: false } },
      },
    });
    this.charts.push(chart);
  }
}
