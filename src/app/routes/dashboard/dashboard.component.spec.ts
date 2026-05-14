import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, ChangeDetectorRef } from '@angular/core';
import { of, throwError } from 'rxjs';
import { Chart } from 'chart.js';
import { MatMenuModule } from '@angular/material/menu';

import { DashboardComponent } from './dashboard.component';
import { DashboardApiService, DashboardStats } from './dashboard.service';
import { AuthService } from '@core/authentication';

// ── Mock data ─────────────────────────────────────────────────────────────────

const mockStats: DashboardStats = {
  totalEmployees:    42,
  newHiresThisMonth: 3,
  byDepartment: [
    { department: 'Engineering', count: 15 },
    { department: 'Design',      count: 8  },
    { department: 'HR',          count: 5  },
  ],
} as any;

// ── Canvas mock ───────────────────────────────────────────────────────────────

const mockCtx: any = {
  save: jasmine.createSpy(), restore: jasmine.createSpy(),
  clearRect: jasmine.createSpy(), fillRect: jasmine.createSpy(),
  beginPath: jasmine.createSpy(), arc: jasmine.createSpy(),
  fill: jasmine.createSpy(), stroke: jasmine.createSpy(),
  measureText: jasmine.createSpy().and.returnValue({ width: 50 }),
  fillText: jasmine.createSpy(), setLineDash: jasmine.createSpy(),
  getLineDash: jasmine.createSpy().and.returnValue([]),
  createLinearGradient: jasmine.createSpy().and.returnValue({ addColorStop: jasmine.createSpy() }),
  scale: jasmine.createSpy(), translate: jasmine.createSpy(),
  moveTo: jasmine.createSpy(), lineTo: jasmine.createSpy(),
  bezierCurveTo: jasmine.createSpy(), closePath: jasmine.createSpy(),
  clip: jasmine.createSpy(), isPointInPath: jasmine.createSpy().and.returnValue(false),
  drawImage: jasmine.createSpy(),
  fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '',
  textBaseline: '', globalAlpha: 1, shadowColor: '', shadowBlur: 0,
  globalCompositeOperation: 'source-over',
};

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture:   ComponentFixture<DashboardComponent>;
  let authSpy:   jasmine.SpyObj<AuthService>;
  let dashSpy:   jasmine.SpyObj<DashboardApiService>;

  function setupAuth(roles: string[]) {
    authSpy.user.and.returnValue(of({ roles } as any));
  }

  beforeEach(async () => {
    spyOn(HTMLCanvasElement.prototype, 'getContext').and.returnValue(mockCtx);
    spyOn(Chart.prototype, 'destroy').and.callFake(() => {});
    spyOn(document, 'getElementById').and.returnValue(document.createElement('canvas'));

    authSpy = jasmine.createSpyObj('AuthService', ['user']);
    dashSpy = jasmine.createSpyObj('DashboardApiService', ['getStats']);
    setupAuth(['ROLE_ADMIN']);
    dashSpy.getStats.and.returnValue(of(mockStats));

    await TestBed.configureTestingModule({
      declarations: [DashboardComponent],
      schemas:      [NO_ERRORS_SCHEMA],
      imports:      [MatMenuModule],
      providers: [
        { provide: AuthService,         useValue: authSpy },
        { provide: DashboardApiService, useValue: dashSpy },
        { provide: ChangeDetectorRef,   useValue: { markForCheck: jasmine.createSpy() } },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    if (fixture) fixture.destroy();
  });

  // ── Creation ──────────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── ngOnInit — role resolution ────────────────────────────────────────────

  it('should set isAdmin=true for ROLE_ADMIN', () => {
    expect(component.isAdmin).toBeTrue();
  });

  it('should set isAdmin=true for ROLE_GENERAL_MANAGER', () => {
    setupAuth(['ROLE_GENERAL_MANAGER']);
    component.ngOnInit();
    expect(component.isAdmin).toBeTrue();
  });

  it('should set isAdmin=true for ADMIN (without ROLE_ prefix)', () => {
    setupAuth(['ADMIN']);
    component.ngOnInit();
    expect(component.isAdmin).toBeTrue();
  });

  it('should set isAdmin=false for a non-admin role', () => {
    setupAuth(['ROLE_EMPLOYEE']);
    component.ngOnInit();
    expect(component.isAdmin).toBeFalse();
  });

  it('should set loading=false and skip loadStats for non-admin', () => {
    setupAuth(['ROLE_EMPLOYEE']);
    dashSpy.getStats.calls.reset();
    component.ngOnInit();
    expect(dashSpy.getStats).not.toHaveBeenCalled();
    expect(component.loading).toBeFalse();
  });

  it('should store currentUser from auth', () => {
    expect(component.currentUser).toEqual({ roles: ['ROLE_ADMIN'] } as any);
  });

  // ── loadStats ─────────────────────────────────────────────────────────────

  it('should call getStats for admin on init', () => {
    expect(dashSpy.getStats).toHaveBeenCalled();
  });

  it('should populate KPI values from stats', fakeAsync(() => {
    fixture.detectChanges();
    tick(0);
    expect(component.kpis[0].value).toBe('42');
    expect(component.kpis[1].value).toBe('3');
    expect(component.kpis[2].value).toBe('3');
  }));

  it('should set largest dept KPI from first byDepartment entry', fakeAsync(() => {
    tick(0);
    expect(component.kpis[3].value).toContain('Engineering');
    expect(component.kpis[3].value).toContain('15');
  }));

  it('should set largest dept KPI to "—" when byDepartment is empty', fakeAsync(() => {
    dashSpy.getStats.and.returnValue(of({ ...mockStats, byDepartment: [] } as any));
    component.ngOnInit();
    tick(0);
    expect(component.kpis[3].value).toBe('—');
  }));

  it('should populate deptLabels and deptData', fakeAsync(() => {
    tick(0);
    expect(component.deptLabels).toEqual(['Engineering', 'Design', 'HR']);
    expect(component.deptData).toEqual([15, 8, 5]);
  }));

  it('should set loading=false after stats load', fakeAsync(() => {
    tick(0);
    expect(component.loading).toBeFalse();
  }));

  it('should set loading=false on stats error', () => {
    dashSpy.getStats.and.returnValue(throwError(() => new Error('fail')));
    component.ngOnInit();
    expect(component.loading).toBeFalse();
  });

  // ── greeting ─────────────────────────────────────────────────────────────

  it('should return "Good morning" before noon', () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-05-01T08:00:00'));
    expect(component.greeting).toBe('Good morning');
    jasmine.clock().uninstall();
  });

  it('should return "Good afternoon" between 12 and 18', () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-05-01T14:00:00'));
    expect(component.greeting).toBe('Good afternoon');
    jasmine.clock().uninstall();
  });

  it('should return "Good evening" at 18 or later', () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-05-01T20:00:00'));
    expect(component.greeting).toBe('Good evening');
    jasmine.clock().uninstall();
  });

  // ── deptTotal ─────────────────────────────────────────────────────────────

  it('should sum deptData correctly', fakeAsync(() => {
    tick(0);
    expect(component.deptTotal).toBe(28);
  }));

  it('should return 0 when deptData is empty', () => {
    component.deptData = [];
    expect(component.deptTotal).toBe(0);
  });

  // ── avgTeamSize ───────────────────────────────────────────────────────────

  it('should compute average team size', fakeAsync(() => {
    tick(0);
    expect(component.avgTeamSize).toBe((28 / 3).toFixed(1));
  }));

  it('should return "—" when deptLabels is empty', () => {
    component.deptLabels = [];
    expect(component.avgTeamSize).toBe('—');
  });

  // ── deptPercent ───────────────────────────────────────────────────────────

  it('should compute department percentage', fakeAsync(() => {
    tick(0);
    expect(component.deptPercent(14)).toBe('50%');
  }));

  it('should return "0%" when total is 0', () => {
    component.deptData = [];
    expect(component.deptPercent(5)).toBe('0%');
  });

  it('should round percentages', fakeAsync(() => {
    tick(0);
    expect(component.deptPercent(15)).toBe(`${Math.round((15 / 28) * 100)}%`);
  }));

  // ── Input handlers ────────────────────────────────────────────────────────

  it('onPeriodChange() should update period and clear selectedDate', () => {
    component.selectedDate = new Date();
    component.onPeriodChange('week');
    expect(component.period).toBe('week');
    expect(component.selectedDate).toBeNull();
  });

  it('onDepartmentChange() should update selectedDepartment', () => {
    component.onDepartmentChange('ENGINEERING');
    expect(component.selectedDepartment).toBe('ENGINEERING');
  });

  it('onDateChange() should update selectedDate', () => {
    const date = new Date('2026-01-15');
    component.onDateChange(date);
    expect(component.selectedDate).toEqual(date);
  });

  it('onDateChange() should accept null', () => {
    component.onDateChange(null);
    expect(component.selectedDate).toBeNull();
  });

  it('clearDate() should set selectedDate to null', () => {
    component.selectedDate = new Date();
    component.clearDate();
    expect(component.selectedDate).toBeNull();
  });

  // ── ngOnDestroy ───────────────────────────────────────────────────────────

  it('should destroy all charts on ngOnDestroy', fakeAsync(() => {
    tick(0);
    const fakeChart = { destroy: jasmine.createSpy('destroy') };
    (component as any).charts.push(fakeChart);
    component.ngOnDestroy();
    expect(fakeChart.destroy).toHaveBeenCalled();
  }));
});