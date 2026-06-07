import {
  Component, OnInit, OnDestroy,
  ChangeDetectorRef, NgZone,
  ChangeDetectionStrategy,
} from '@angular/core';
import { forkJoin } from 'rxjs';
import { take } from 'rxjs/operators';   // ← was missing
import { AttendanceService } from '../../attendance/services/attendance.service';
import { AttendanceSummary }  from '../../attendance/models/attendance.model';
import { ProjectService, Project } from '../../projects/project.service';
import { AuthService } from '@core/authentication/auth.service';

// ── Internal types ────────────────────────────────────────────────────────────
interface StatusBar {
  label:      string;
  value:      number;
  realValue:  number;
  valueColor: string;
  gradient:   string;
  glowColor:  string;
  lightBg:    string;
  animDelay:  string;
  cardDelay:  string;
}

interface StatusConfig {
  label:  string;
  color:  string;
  bg:     string;
  border: string;
}

interface ProjectDisplay {
  id:       number;
  name:     string;
  code:     string;
  role:     string;
  progress: number;
  dueDate:  string;
  status:   string;
}

@Component({
  selector: 'app-employee-dashboard',
  templateUrl: './employee-dashboard.component.html',
  styleUrls:  ['./employee-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeDashboardComponent implements OnInit, OnDestroy {

  // ── Attendance ────────────────────────────────────────────────────────────
  summary: AttendanceSummary | null = null;
  yMax  = 6;
  yTicks: number[] = [];

  barsReady  = false;
  cardsReady = false;
  arcReady   = false;

  statusBars: StatusBar[] = [];

  attendanceRate = 0;
  displayedRate  = 0;
  rateDelta      = 0;

  // ── Projects ──────────────────────────────────────────────────────────────
  myProjects:     ProjectDisplay[] = [];
  projectsLoading = true;
  projectsReady   = false;

  // ── Private ───────────────────────────────────────────────────────────────
  private totalDays    = 0;
  private targetValues = [0, 0, 0, 0, 0];
  private countUpTimer: ReturnType<typeof setInterval> | null = null;
  private pendingTimers: ReturnType<typeof setTimeout>[]      = [];

  private readonly AVATAR_PALETTE = [
    '#1e3a5f', '#d4920a', '#059669',
    '#6d28d9', '#e11d48', '#0891b2', '#ea580c',
  ];

  private readonly STATUS_CONFIG: Record<string, StatusConfig> = {
    IN_PROGRESS: { label: 'In Progress', color: '#2563eb', bg: '#eff6ff', border: 'rgba(37,99,235,0.2)'   },
    PLANNED:     { label: 'Planned',     color: '#64748b', bg: '#f1f5f9', border: 'rgba(100,116,139,0.2)' },
    ON_HOLD:     { label: 'On Hold',     color: '#d4920a', bg: '#fffbeb', border: 'rgba(212,146,10,0.2)'  },
    COMPLETED:   { label: 'Completed',   color: '#059669', bg: '#ecfdf5', border: 'rgba(5,150,105,0.2)'   },
    CANCELLED:   { label: 'Cancelled',   color: '#e11d48', bg: '#fff1f2', border: 'rgba(225,29,72,0.2)'   },
  };

  constructor(
    private attendanceService: AttendanceService,
    private projectService:    ProjectService,
    private authService:       AuthService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
  ) {}

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadAttendance();

    // Grab the current user once, then load their projects
    this.authService.user().pipe(take(1)).subscribe(user => {
      const employeeId = user?.['id'] as number | undefined;
      if (employeeId) {
        this.loadProjects(employeeId);
      } else {
        // Fallback: try localStorage in case the stream emits an empty object
        try {
          const stored = localStorage.getItem('currentUser');
          const id     = stored ? JSON.parse(stored)?.id : null;
          if (id) {
            this.loadProjects(id);
          } else {
            this.projectsLoading = false;
            this.cdr.markForCheck();
          }
        } catch {
          this.projectsLoading = false;
          this.cdr.markForCheck();
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.pendingTimers.forEach(t => clearTimeout(t));
    if (this.countUpTimer) clearInterval(this.countUpTimer);
  }

  // ── Public getters ────────────────────────────────────────────────────────

  get currentMonthLabel(): string {
    return new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  get prevMonthLabel(): string {
    const now = new Date();
    const m   = now.getMonth() === 0 ? 12 : now.getMonth();
    const y   = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  get rateStrokeDasharray(): string {
    const c = 2 * Math.PI * 90;
    return `${(c * this.attendanceRate) / 100} ${c}`;
  }

  getPercent(realValue: number): number {
    return this.totalDays > 0 ? Math.round((realValue / this.totalDays) * 100) : 0;
  }

  // ── Project template helpers ──────────────────────────────────────────────

  getInitials(name: string): string {
    return name.split(' ').slice(0, 2)
      .map(w => w.charAt(0)).join('').toUpperCase();
  }

  getAvatarColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash) + name.charCodeAt(i);
      hash |= 0;
    }
    return this.AVATAR_PALETTE[Math.abs(hash) % this.AVATAR_PALETTE.length];
  }

  getStatusConfig(status: string): StatusConfig {
    return this.STATUS_CONFIG[status]
      ?? { label: status, color: '#64748b', bg: '#f1f5f9', border: 'rgba(100,116,139,0.2)' };
  }

  formatDueDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  }

  // ── Private: Attendance ───────────────────────────────────────────────────

  private loadAttendance(): void {
    const now       = new Date();
    const curMonth  = now.getMonth() + 1;
    const curYear   = now.getFullYear();
    const prevMonth = curMonth === 1 ? 12 : curMonth - 1;
    const prevYear  = curMonth === 1 ? curYear - 1 : curYear;

    forkJoin({
      current:  this.attendanceService.getMySummary({ month: curMonth,  year: curYear  }),
      previous: this.attendanceService.getMySummary({ month: prevMonth, year: prevYear }),
    }).subscribe({
      next: ({ current, previous }) => {
        this.summary = current;
        this.buildChartTicks(current);
        this.computeRates(current, previous);

        this.targetValues = [
          current.presentDays ?? 0, current.lateDays   ?? 0,
          current.absentDays  ?? 0, current.halfDays   ?? 0, current.leaveDays ?? 0,
        ];
        this.totalDays = this.targetValues.reduce((a, b) => a + b, 0);

        this.statusBars = this.buildStatusBars(this.targetValues);
        this.statusBars.forEach(b => (b.value = 0));

        this.after(120, () => { this.cardsReady = true; this.cdr.markForCheck(); });
        this.after(220, () => { this.barsReady  = true; this.cdr.markForCheck(); });
        this.after(300, () => { this.arcReady   = true; this.cdr.markForCheck(); });
        this.after(360, () => { this.runCountUp(); });
      },
    });
  }

  // ── Private: Projects ─────────────────────────────────────────────────────

  // ← Now correctly accepts the employeeId as a parameter
  private loadProjects(employeeId: number): void {
    this.projectsLoading = true;

    this.projectService.getByEmployee(employeeId).subscribe({
      next: (projects: Project[]) => {
        this.myProjects = projects
          .filter(p => p.status !== 'CANCELLED')
          .map(p => this.mapProjectToDisplay(p));

        this.projectsLoading = false;

        this.after(180, () => {
          this.projectsReady = true;
          this.cdr.markForCheck();
        });
      },
      error: () => {
        this.projectsLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private mapProjectToDisplay(p: Project): ProjectDisplay {
    return {
      id:       p.id,
      name:     p.name,
      code:     p.code,
      role:     p.projectManagerName
                  ? `PM: ${p.projectManagerName}`
                  : 'Team Member',
      progress: this.calcProgress(p.startDate, p.endDate),
      dueDate:  p.endDate,
      status:   p.status,
    };
  }

  private calcProgress(startDate: string, endDate: string): number {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate).getTime();
    const end   = new Date(endDate).getTime();
    const now   = Date.now();
    if (now <= start) return 0;
    if (now >= end)   return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  }

  // ── Private: Helpers ──────────────────────────────────────────────────────

  private after(ms: number, fn: () => void): void {
    this.pendingTimers.push(setTimeout(fn, ms));
  }

  private computeRates(current: AttendanceSummary, previous: AttendanceSummary): void {
    const rate = (d: AttendanceSummary) => {
      const worked = (d.presentDays ?? 0) + (d.lateDays ?? 0) + (d.halfDays ?? 0);
      const total  = worked + (d.absentDays ?? 0);
      return total > 0 ? Math.round((worked / total) * 100) : 0;
    };
    this.attendanceRate = rate(current);
    this.rateDelta      = this.attendanceRate - rate(previous);
  }

  private buildStatusBars(targets: number[]): StatusBar[] {
    const configs = [
      { label: 'PRESENT',  valueColor: '#059669', gradient: 'linear-gradient(180deg,#6ee7b7 0%,#059669 100%)', glowColor: 'rgba(5,150,105,0.22)',   lightBg: '#ecfdf5', animDelay: '0s',    cardDelay: '0s'    },
      { label: 'LATE',     valueColor: '#d4920a', gradient: 'linear-gradient(180deg,#fde68a 0%,#d4920a 100%)', glowColor: 'rgba(212,146,10,0.22)', lightBg: '#fffbeb', animDelay: '0.12s', cardDelay: '0.07s' },
      { label: 'ABSENT',   valueColor: '#e11d48', gradient: 'linear-gradient(180deg,#fda4af 0%,#e11d48 100%)', glowColor: 'rgba(225,29,72,0.2)',   lightBg: '#fff1f2', animDelay: '0.24s', cardDelay: '0.14s' },
      { label: 'HALF DAY', valueColor: '#6d28d9', gradient: 'linear-gradient(180deg,#c4b5fd 0%,#6d28d9 100%)', glowColor: 'rgba(109,40,217,0.2)',  lightBg: '#f5f3ff', animDelay: '0.36s', cardDelay: '0.21s' },
      { label: 'LEAVE',    valueColor: '#1e3a5f', gradient: 'linear-gradient(180deg,#7dd3fc 0%,#1e3a5f 100%)', glowColor: 'rgba(30,58,95,0.22)',   lightBg: '#eff6ff', animDelay: '0.48s', cardDelay: '0.28s' },
    ];
    return configs.map((cfg, i) => ({ ...cfg, value: 0, realValue: targets[i] }));
  }

  private runCountUp(): void {
    const rateTarget = this.attendanceRate;
    const barTargets = [...this.targetValues];
    const duration   = 1400;
    const fps        = 30;
    const steps      = Math.round((duration / 1000) * fps);
    let   step       = 0;

    this.ngZone.runOutsideAngular(() => {
      this.countUpTimer = setInterval(() => {
        step++;
        const progress = Math.min(step / steps, 1);
        const eased    = 1 - Math.pow(1 - progress, 3);

        this.displayedRate = Math.round(rateTarget * eased);
        this.statusBars.forEach((bar, i) => {
          bar.value = Math.round(barTargets[i] * eased);
        });
        this.cdr.detectChanges();

        if (step >= steps) {
          clearInterval(this.countUpTimer!);
          this.countUpTimer  = null;
          this.displayedRate = rateTarget;
          this.statusBars.forEach((bar, i) => { bar.value = barTargets[i]; });
          this.cdr.detectChanges();
        }
      }, Math.round(1000 / fps));
    });
  }

  private buildChartTicks(data: AttendanceSummary): void {
    const vals = [
      data.presentDays ?? 0, data.lateDays    ?? 0,
      data.absentDays  ?? 0, data.halfDays    ?? 0, data.leaveDays ?? 0,
    ];
    const max   = Math.max(...vals, 6);
    this.yMax   = max;
    this.yTicks = Array.from({ length: max + 1 }, (_, i) => max - i);
  }
}