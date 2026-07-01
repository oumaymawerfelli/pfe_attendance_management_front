import {
  Component, OnInit, AfterViewInit,
  OnDestroy, ChangeDetectorRef,
} from '@angular/core';
import { Subject, take, takeUntil } from 'rxjs';
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
  employeeTrend = '+8.3%';

  contractTypes: ContractTypeStat[] = [
    { key: 'CDI', label: 'Full-Time', count: 0, color: '#1a2e5a' },
    { key: 'CTP', label: 'Part-Time', count: 0, color: '#f59e0b' },
    { key: 'CDD', label: 'Contract',  count: 0, color: '#94a3b8' },
  ];

  contractIcons = ['work', 'schedule', 'person_outline'];

  contractSparklines = [
    '0,20 10,17 20,15 30,13 40,10 50,7 60,4',
    '0,18 10,17 20,19 30,15 40,16 50,13 60,10',
    '0,14 10,16 20,18 30,15 40,17 50,15 60,13',
  ];

  sparkEndX = [60, 60, 60];
  sparkEndY = [4, 10, 13];

  private readonly contractKeyMap: Record<string, number> = {
    CDI: 0, CTT: 0, ESSAI: 0, MISSION: 0, FREELANCE: 0,
    CTP: 1, ALTERNANCE: 1,
    CDD: 2,
  };

  deptLabels: string[] = [];
  deptData:   number[] = [];

  deptColors = [
    '#1a2e5a', '#f59e0b', '#3b82f6', '#60a5fa', '#6b7280',
    '#9ca3af', '#d97706', '#374151', '#0F6E56',
  ];

  private charts: Chart[] = [];
  private destroy$ = new Subject<void>();
  private statsLoaded = false;   // ← guard so loadStats only runs ONCE

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
    console.log('[Dashboard] period →', value);   // ← debug
    this.period       = value;
    this.selectedDate = null;
    this.cdr.markForCheck();
  }

  onDepartmentChange(value: string): void {
    console.log('[Dashboard] department →', value);   // ← debug
    this.selectedDepartment = value;
    this.cdr.markForCheck();
  }

  onDateChange(date: Date | null): void {
    console.log('[Dashboard] date →', date);   // ← debug
    this.selectedDate = date;
    this.cdr.markForCheck();
  }

  onContractTypeChange(key: string): void {
    console.log('[Dashboard] contractType →', key);   // ← debug
    this.selectedContractType = key;
    this.cdr.markForCheck();
  }

  // ── Employee-type filter helpers ──────────────────────────

  /** Whether a given contract type should be shown given the current filter. */
  isTypeVisible(key: string): boolean {
    return this.selectedContractType === 'ALL'
        || this.selectedContractType === key;
  }

  /** Total to display: full total when ALL, else just the selected type's count. */
  get displayedTotal(): number {
    if (this.selectedContractType === 'ALL') return this.deptTotal;
    return this.contractTypes.find(t => t.key === this.selectedContractType)?.count ?? 0;
  }

  /** Label shown on the "Employee type" pill. */
  get contractTypeLabel(): string {
    if (this.selectedContractType === 'ALL') return 'All types';
    return this.contractTypes.find(t => t.key === this.selectedContractType)?.label
        ?? 'Employee type';
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
    // ✅ Use take(1) so auth.user() re-emits don't re-trigger loadStats
    // (Previously, every emit destroyed/remounted attendance-overview via *ngIf="!loading")
    this.auth.user()
      .pipe(take(1), takeUntil(this.destroy$))
      .subscribe((user: any) => {
        const roles: string[] = Array.isArray(user?.roles)
          ? user.roles.map((r: any) => (typeof r === 'string' ? r : r?.name ?? ''))
          : [];
        this.isAdmin = roles.some((r: string) =>
          ['ADMIN', 'GENERAL_MANAGER', 'ROLE_ADMIN', 'ROLE_GENERAL_MANAGER'].includes(r),
        );

        if (this.isAdmin && !this.statsLoaded) {
          this.loadStats();
        } else if (!this.isAdmin) {
          this.loading = false;
        }
        this.cdr.markForCheck();
      });
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

        if ((stats as any).employeeTrend) {
          this.employeeTrend = (stats as any).employeeTrend;
        }

        this.populateContractTypes(stats);

        this.statsLoaded = true;     // ← guard set
        this.loading     = false;
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