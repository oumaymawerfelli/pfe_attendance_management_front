// attendance-overview.component.ts
import {
  Component, OnInit, OnChanges, OnDestroy, AfterViewInit,
  Input, Output, EventEmitter, SimpleChanges,
  ViewChild, ElementRef,
  ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule }   from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MatIconModule }  from '@angular/material/icon';
import { Chart, registerables } from 'chart.js';
import { environment } from '@env/environment';

Chart.register(...registerables);

export type Period = 'day' | 'week' | 'month' | 'year';
const VALID_PERIODS: Period[] = ['day', 'week', 'month', 'year'];
function toPeriod(v: string): Period {
  return VALID_PERIODS.includes(v as Period) ? (v as Period) : 'day';
}

export interface AttendanceOverview {
  onTime:    number;
  late:      number;
  absent:    number;
  onLeave:   number;
  remote:    number;
  onTimeTrend:   number;
  lateTrend:     number;
  absentTrend:   number;
  onLeaveTrend:  number;
  remoteTrend:   number;
  attendanceRate:      number;
  attendanceRateTrend: number;
  totalEmployees:      number;
  weekLabels:          string[];
  weeklyRates:         number[];
  previousPeriodRates: number[];   // for trend comparison line
  lateSparkline:       number[];
  absentSparkline:     number[];
  onLeaveSparkline:    number[];
  remoteSparkline:     number[];
}

@Component({
  selector: 'app-attendance-overview',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './attendance-overview.component.html',
  styleUrls:   ['./attendance-overview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceOverviewComponent
  implements OnInit, OnChanges, AfterViewInit, OnDestroy {

  Math = Math;

  @Input() period:       string       = 'day';
  @Input() department:   string       = 'ALL';
  @Input() specificDate: Date | null  = null;

  @Output() periodChange = new EventEmitter<Period>();

  activePeriod: Period = 'day';

  // 6 canvases
  @ViewChild('gaugeCanvas') gaugeRef!:  ElementRef<HTMLCanvasElement>;
  @ViewChild('lineCanvas')  lineRef!:   ElementRef<HTMLCanvasElement>;
  @ViewChild('trendCanvas') trendRef!:  ElementRef<HTMLCanvasElement>;
  @ViewChild('spark1')      spark1Ref!: ElementRef<HTMLCanvasElement>;
  @ViewChild('spark2')      spark2Ref!: ElementRef<HTMLCanvasElement>;
  @ViewChild('spark3')      spark3Ref!: ElementRef<HTMLCanvasElement>;
  @ViewChild('spark4')      spark4Ref!: ElementRef<HTMLCanvasElement>;

  loading = true;
  error   = false;
  data!:  AttendanceOverview;

  private charts:   Chart[] = [];
  private viewReady = false;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.activePeriod = toPeriod(this.period);
    this.load();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    if (this.data) this.buildAllCharts();
  }

  ngOnDestroy(): void { this.destroyCharts(); }

  ngOnChanges(c: SimpleChanges): void {
    if (c['period'] && !c['period'].firstChange) {
      this.activePeriod = toPeriod(this.period);
    }
    const keys = ['period', 'department', 'specificDate'];
    if (keys.some(k => c[k] && !c[k].firstChange)) {
      this.activePeriod = toPeriod(this.period);
      this.load();
    }
  }

  // ── Period tab ─────────────────────────────────────────────────────────────

  setPeriod(p: Period): void {
    if (this.activePeriod === p) return;
    this.activePeriod = p;
    this.periodChange.emit(p);
    this.load();
  }

  // ── Derived getters ────────────────────────────────────────────────────────

  get compareLabel(): string {
    if (this.specificDate) return 'for selected date';
    return { day: 'vs yesterday', week: 'vs last week', month: 'vs last month', year: 'vs last year' }
      [this.activePeriod] ?? '';
  }

  get activePeriodLabel(): string {
    return { day: 'Today', week: 'This week', month: 'This month', year: 'This year' }
      [this.activePeriod] ?? 'This period';
  }

  get needAttention(): number {
    return (this.data?.late ?? 0) + (this.data?.absent ?? 0);
  }

  get needAttentionPct(): string {
    if (!this.data?.totalEmployees) return '0';
    return ((this.needAttention / this.data.totalEmployees) * 100).toFixed(1);
  }

  get insightText(): string {
    if (!this.data) return '';
    const t  = this.data.attendanceRateTrend;
    const vs = this.compareLabel;
    if (t > 0)  return `Great job! 🎉 Your attendance rate is <strong>${t}%</strong> higher than ${vs.replace('vs ', '')}.`;
    if (t < 0)  return `Attendance rate dropped by <strong>${Math.abs(t)}%</strong> ${vs}.`;
    return `Attendance rate is <strong>stable</strong> ${vs}.`;
  }

  trendUp(v: number):   boolean { return v > 0; }
  trendDown(v: number): boolean { return v < 0; }

  // ── Data loading ───────────────────────────────────────────────────────────

  private load(): void {
    this.loading = true;
    this.error   = false;
    this.cdr.markForCheck();

    let params = new HttpParams();
    if (this.specificDate) {
      const d = this.specificDate;
      params = params.set('period', 'specific').set('date',
        `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
    } else {
      params = params.set('period', this.activePeriod);
    }
    if (this.department && this.department !== 'ALL')
      params = params.set('department', this.department);

    this.http.get<AttendanceOverview>(
      `${environment.apiUrl}/dashboard/attendance-overview`, { params }
    ).subscribe({
      next: d => {
        this.data    = d;
        this.loading = false;
        this.cdr.markForCheck();
        setTimeout(() => { if (this.viewReady) this.buildAllCharts(); }, 0);
      },
      error: () => {
        this.error   = true;
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ── Charts ─────────────────────────────────────────────────────────────────

  private destroyCharts(): void {
    this.charts.forEach(c => c.destroy());
    this.charts = [];
  }

  private buildAllCharts(): void {
    this.destroyCharts();
    this.buildGauge();
    this.buildHeroLine();
    this.buildTrendChart();
    this.buildSparkline(this.spark1Ref, this.data.lateSparkline,     '#f97316', 'line');
    this.buildSparkline(this.spark2Ref, this.data.absentSparkline,   '#ef4444', 'bar');
    this.buildSparkline(this.spark3Ref, this.data.onLeaveSparkline,  '#7c3aed', 'line');
    this.buildSparkline(this.spark4Ref, this.data.remoteSparkline,   '#0891b2', 'line');
  }

  // Horseshoe/speedometer gauge:
  //   rotation:135, circumference:270 → opens at the bottom (6 o'clock)
  //   data[0] = blue  = attendance rate (progress)
  //   data[1] = orange = remaining track
  private buildGauge(): void {
    const cv = this.gaugeRef?.nativeElement;
    if (!cv) return;

    const pct = this.data.attendanceRate;
    const gap = 100 - pct;

    // Plugin: white glowing dot at the tip of the blue arc
    const glowDotPlugin = {
      id: 'glowDot',
      afterDraw(chart: Chart) {
        const meta = chart.getDatasetMeta(0);
        const arc  = meta.data[0] as any;
        if (!arc) return;
        const ctx = chart.ctx;
        const { x, y, outerRadius } = arc;
        // Use endAngle for progress; fall back to startAngle when pct ≈ 0
        const angle = (pct < 0.5) ? arc.startAngle : arc.endAngle;
        const r     = outerRadius - 2;
        const dotX  = x + Math.cos(angle) * r;
        const dotY  = y + Math.sin(angle) * r;

        // Glow halo
        const grd = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 14);
        grd.addColorStop(0, 'rgba(255,255,255,0.65)');
        grd.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.arc(dotX, dotY, 14, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Solid white dot
        ctx.beginPath();
        ctx.arc(dotX, dotY, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(255,255,255,0.8)';
        ctx.shadowBlur  = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      },
    };

    const chart = new Chart<'doughnut'>(cv, {
      type: 'doughnut',
      data: {
        datasets: [{
          data:            [pct, gap],
          backgroundColor: ['#3b82f6', '#f97316'],
          borderWidth:     0,
          circumference:   360,   // full circle
          rotation:        45,    // orange gap lands at ~1 o'clock (top-right)
        }],
      },
      options: {
        responsive:          false,
        maintainAspectRatio: false,
        cutout:              '72%',
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
      },
      plugins: [glowDotPlugin as any],
    });
    this.charts.push(chart);
  }

  // Hero line chart — dark card, gradient fill, last-point badge
  private buildHeroLine(): void {
    const cv = this.lineRef?.nativeElement;
    if (!cv || !this.data.weeklyRates?.length) return;

    const rates     = this.data.weeklyRates;
    const lastRate  = rates[rates.length - 1];

    // Plugin: draw floating "94.2%" badge at last data point
    const lastLabelPlugin = {
      id: 'lastLabel',
      afterDraw(chart: Chart) {
        const meta = chart.getDatasetMeta(0);
        const last = meta.data[meta.data.length - 1] as any;
        if (!last) return;
        const ctx  = chart.ctx;
        const x    = last.x;
        const y    = last.y - 18;
        const text = `${lastRate}%`;

        ctx.save();
        ctx.font = 'bold 11px Inter, system-ui, sans-serif';
        const tw  = ctx.measureText(text).width;
        const pad = 7;
        const bw  = tw + pad * 2;
        const bh  = 20;
        const bx  = x - bw / 2;
        const by  = y - bh / 2;

        ctx.fillStyle = '#3b82f6';
        (ctx as any).roundRect ? (ctx as any).roundRect(bx, by, bw, bh, 4) : ctx.rect(bx, by, bw, bh);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y);
        ctx.restore();
      },
    };

    const chart = new Chart<'line'>(cv, {
      type: 'line',
      data: {
        labels:   this.data.weekLabels,
        datasets: [{
          data: rates,
          borderColor:          '#3b82f6',
          borderWidth:          2.5,
          backgroundColor(context: any) {
            const { ctx: c, chartArea } = context.chart;
            if (!chartArea) return 'rgba(59,130,246,0)';
            const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            g.addColorStop(0, 'rgba(59,130,246,0.45)');
            g.addColorStop(1, 'rgba(59,130,246,0.0)');
            return g;
          },
          fill:                 true,
          tension:              0.4,
          pointBackgroundColor: '#ffffff',
          pointBorderColor:     '#3b82f6',
          pointBorderWidth:     2,
          pointRadius:          5,
          pointHoverRadius:     7,
        } as any],
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        layout: { padding: { top: 30, right: 12, bottom: 4, left: 4 } },
        plugins: {
          legend:  { display: false },
          tooltip: {
            backgroundColor: '#3b82f6',
            cornerRadius:    6,
            displayColors:   false,
            callbacks:       { title: () => '', label: c => `${c.raw}%` },
          },
        },
        scales: {
          x: {
            grid:   { color: 'rgba(255,255,255,0.06)', drawTicks: false },
            ticks:  { color: 'rgba(255,255,255,0.45)', font: { size: 11 }, padding: 6 },
            border: { display: false },
          },
          y: {
            min: 0, max: 100,
            ticks: {
              color:    'rgba(255,255,255,0.4)',
              font:     { size: 10 },
              callback: (v: any) => v + '%',
              stepSize: 25,
              padding:  8,
            },
            grid:   { color: 'rgba(255,255,255,0.06)', drawTicks: false },
            border: { display: false },
          },
        },
      },
      plugins: [lastLabelPlugin],
    });
    this.charts.push(chart);
  }

  // Attendance Trend — two lines: this period (solid blue fill) vs last (dashed gray)
  private buildTrendChart(): void {
    const cv = this.trendRef?.nativeElement;
    if (!cv || !this.data.weeklyRates?.length) return;

    const prevRates = this.data.previousPeriodRates?.length
      ? this.data.previousPeriodRates
      : this.data.weeklyRates.map(v => +(v * 0.85 + Math.random() * 10).toFixed(1));

    const chart = new Chart<'line'>(cv, {
      type: 'line',
      data: {
        labels:   this.data.weekLabels,
        datasets: [
          {
            label:                'This period',
            data:                 this.data.weeklyRates,
            borderColor:          '#3b82f6',
            borderWidth:          2.5,
            backgroundColor(context: any) {
              const { ctx: c, chartArea } = context.chart;
              if (!chartArea) return 'rgba(59,130,246,0)';
              const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              g.addColorStop(0, 'rgba(59,130,246,0.20)');
              g.addColorStop(1, 'rgba(59,130,246,0.00)');
              return g;
            },
            fill:                 true,
            tension:              0.4,
            pointBackgroundColor: '#3b82f6',
            pointBorderColor:     '#ffffff',
            pointBorderWidth:     2,
            pointRadius:          4,
            pointHoverRadius:     6,
          } as any,
          {
            label:                'Last period',
            data:                 prevRates,
            borderColor:          '#94a3b8',
            borderWidth:          2,
            borderDash:           [5, 4],
            backgroundColor:      'transparent',
            fill:                 false,
            tension:              0.4,
            pointBackgroundColor: '#94a3b8',
            pointBorderColor:     '#ffffff',
            pointBorderWidth:     1.5,
            pointRadius:          3,
            pointHoverRadius:     5,
          } as any,
        ],
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        layout: { padding: { top: 10, right: 8, bottom: 0, left: 0 } },
        plugins: {
          legend:  { display: false },
          tooltip: {
            mode:            'index' as const,
            intersect:       false,
            backgroundColor: '#1a2e5a',
            cornerRadius:    8,
            padding:         10,
            titleColor:      'rgba(255,255,255,0.6)',
            bodyColor:       '#ffffff',
            displayColors:   true,
            callbacks:       { label: c => ` ${c.dataset.label}: ${c.raw}%` },
          },
        },
        scales: {
          x: {
            grid:   { display: false },
            ticks:  { color: '#94a3b8', font: { size: 12 }, padding: 6 },
            border: { display: false },
          },
          y: {
            min: 0, max: 100,
            ticks: {
              color:    '#94a3b8',
              font:     { size: 11 },
              callback: (v: any) => v + '%',
              stepSize: 25,
              padding:  8,
            },
            grid:   { color: '#f1f5f9', drawTicks: false },
            border: { display: false },
          },
        },
      },
    });
    this.charts.push(chart);
  }

  // Sparklines for 4 stat cards
  private buildSparkline(
    ref:   ElementRef<HTMLCanvasElement>,
    data:  number[],
    color: string,
    type:  'line' | 'bar'
  ): void {
    const cv = ref?.nativeElement;
    if (!cv || !data?.length) return;

    const chart = new Chart(cv, {
      type,
      data: {
        labels:   data.map((_, i) => i),
        datasets: [{
          data,
          borderColor:     color,
          borderWidth:     1.5,
          backgroundColor: color + '22',
          fill:            type === 'line',
          tension:         0.4,
          pointRadius:     0,
          barPercentage:   0.5,
          borderRadius:    type === 'bar' ? 2 : 0,
        } as any],
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales:  { x: { display: false }, y: { display: false } },
      },
    } as any);
    this.charts.push(chart);
  }
}