import {
  Component, OnInit, AfterViewInit,
  OnDestroy, ChangeDetectorRef,
} from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { AuthService } from '@core/authentication';
import { DashboardApiService, DashboardStats } from './dashboard.service';

Chart.register(...registerables);

export interface ContractTypeStat {
  key: string;
  label: string;
  count: number;
  color: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {

  isAdmin = false;
  loading = true;

  kpis = [
    { label: 'Total employees', value: '—', sub: 'active' },
    { label: 'New hires',       value: '—', sub: 'this month' },
    { label: 'Departments',     value: '—', sub: 'in the company' },
    { label: 'Largest dept',    value: '—', sub: 'by headcount' },
  ];

  period             = 'day';
  selectedDepartment = 'ALL';
  selectedDate: Date | null = null;

  selectedContractType = 'ALL';

  // ── Employee trend (from API or default) ──────────────────
  employeeTrend = '+8.3%';

  // ── Contract types — updated colors to match design ──────
  contractTypes: ContractTypeStat[] = [
    { key: 'CDI', label: 'Full-Time', count: 0, color: '#1a2e5a' },
    { key: 'CTP', label: 'Part-Time', count: 0, color: '#f59e0b' },
    { key: 'CDD', label: 'Contract',  count: 0, color: '#94a3b8' },
  ];

  // ── Icons for each contract type card ────────────────────
  contractIcons = ['work', 'schedule', 'person_outline'];

  // ── Sparklines: [x,y] polyline points for SVG (60×24 viewport) ──
  contractSparklines = [
    '0,20 10,17 20,15 30,13 40,10 50,7 60,4',   // Full-Time: upward
    '0,18 10,17 20,19 30,15 40,16 50,13 60,10',  // Part-Time: slight up
    '0,14 10,16 20,18 30,15 40,17 50,15 60,13',  // Contract: flat/slight
  ];

  // End points of each sparkline (for the dot)
  sparkEndX = [60, 60, 60];
  sparkEndY = [4, 10, 13];

  private readonly contractKeyMap: Record<string, number> = {
    CDI: 0, CTT: 0, ESSAI: 0, MISSION: 0, FREELANCE: 0,
    CTP: 1, ALTERNANCE: 1,
    CDD: 2,
  };

  deptLabels: string[] = [];
  deptData:   number[] = [];

  // ── Department colors — matching the design screenshot ───
  deptColors = [
    '#1a2e5a',  // IT          — dark navy
    '#f59e0b',  // Marketing   — amber
    '#3b82f6',  // Operations  — blue
    '#60a5fa',  // Finance     — light blue
    '#6b7280',  // HR          — gray
    '#9ca3af',  // Cust. Svc   — light gray
    '#d97706',  // Sales       — dark amber
    '#374151',  // R&D         — dark gray
    '#0F6E56',  // extra
  ];

  private charts: Chart[] = [];

  constructor(
    private auth:    AuthService,
    private dashApi: DashboardApiService,
    private cdr:     ChangeDetectorRef,
  ) {}

  // ── Getters ───────────────────────────────────────────────

  get deptTotal(): number {
    return this.deptData.reduce((a, b) => a + b, 0);
  }

  get avgTeamSize(): string {
    if (!this.deptLabels.length) return '—';
    return (this.deptTotal / this.deptLabels.length).toFixed(1);
  }

  // ── Event handlers ────────────────────────────────────────

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

  onContractTypeChange(key: string): void {
    this.selectedContractType = key;
    this.cdr.markForCheck();
  }

  // ── Helpers ───────────────────────────────────────────────

  deptPercent(count: number): string {
    const total = this.deptTotal;
    if (total === 0) return '0%';
    return Math.round((count / total) * 100) + '%';
  }

  contractPct(count: number): string {
    const total = this.contractTypes.reduce((a, t) => a + t.count, 0);
    if (total === 0) return '0%';
    return Math.round((count / total) * 100) + '%';
  }

  /** Returns a Material icon name for a given department label */
  getDeptIcon(name: string): string {
    const n = (name || '').toLowerCase();
    if (n.includes('it') || n.includes('tech'))         return 'computer';
    if (n.includes('market'))                           return 'campaign';
    if (n.includes('operat'))                           return 'settings';
    if (n.includes('financ') || n.includes('account'))  return 'attach_money';
    if (n.includes('hr') || n.includes('human'))        return 'people';
    if (n.includes('customer') || n.includes('support')) return 'headphones';
    if (n.includes('sales'))                            return 'bar_chart';
    if (n.includes('research') || n.includes('r&d'))    return 'science';
    if (n.includes('legal'))                            return 'gavel';
    if (n.includes('product'))                          return 'inventory_2';
    if (n.includes('design'))                           return 'palette';
    return 'business';
  }

  // ── Lifecycle ─────────────────────────────────────────────

  ngOnInit(): void {
    this.auth.user().subscribe((user: any) => {
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

  // ── Data loading ──────────────────────────────────────────

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

        // Optionally read trend from API if available
        if ((stats as any).employeeTrend) {
          this.employeeTrend = (stats as any).employeeTrend;
        }

        this.populateContractTypes(stats);

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

  private populateContractTypes(stats: DashboardStats): void {
    this.contractTypes.forEach(t => (t.count = 0));

    if (stats.byContractType?.length) {
      stats.byContractType.forEach(item => {
        const idx = this.contractKeyMap[item.contractType];
        if (idx !== undefined && this.contractTypes[idx]) {
          this.contractTypes[idx].count += item.count;
        }
      });
    } else {
      const t = stats.totalEmployees;
      this.contractTypes[0].count = Math.round(t * 0.55);
      this.contractTypes[1].count = Math.round(t * 0.15);
      this.contractTypes[2].count = Math.round(t * 0.30);
    }
  }

  // ── Donut chart ───────────────────────────────────────────

  private buildDonutChart(): void {
    this.charts.forEach(c => c.destroy());
    this.charts = [];

    const canvas = document.getElementById('donutChart') as HTMLCanvasElement;
    if (!canvas || !this.deptData.length) return;

    const total = this.deptTotal;

    const chart = new Chart(canvas, {
      type: 'doughnut',
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
        responsive:          false,
        maintainAspectRatio: false,
        cutout:              '65%',
        animation: {
          animateRotate: true,
          duration:      900,
          easing:        'easeInOutQuart',
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(26, 46, 90, 0.95)',
            borderColor:     'rgba(255, 255, 255, 0.1)',
            borderWidth:     1,
            titleColor:      '#e8eaf0',
            bodyColor:       'rgba(255,255,255,0.7)',
            padding:         10,
            cornerRadius:    8,
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