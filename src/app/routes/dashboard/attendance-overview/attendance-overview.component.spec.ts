import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ChangeDetectorRef, SimpleChange, NO_ERRORS_SCHEMA } from '@angular/core';
import { Chart } from 'chart.js';

import { AttendanceOverviewComponent, AttendanceOverview, Period } from './attendance-overview.component';
import { environment } from '@env/environment';

// ── Canvas mock ───────────────────────────────────────────────────────────────

const mockCtx: any = {
  canvas: { width: 300, height: 200 },
  save: jasmine.createSpy('save'),
  restore: jasmine.createSpy('restore'),
  scale: jasmine.createSpy('scale'),
  clearRect: jasmine.createSpy('clearRect'),
  fillRect: jasmine.createSpy('fillRect'),
  beginPath: jasmine.createSpy('beginPath'),
  closePath: jasmine.createSpy('closePath'),
  moveTo: jasmine.createSpy('moveTo'),
  lineTo: jasmine.createSpy('lineTo'),
  bezierCurveTo: jasmine.createSpy('bezierCurveTo'),
  arc: jasmine.createSpy('arc'),
  rect: jasmine.createSpy('rect'),
  fill: jasmine.createSpy('fill'),
  stroke: jasmine.createSpy('stroke'),
  clip: jasmine.createSpy('clip'),
  setLineDash: jasmine.createSpy('setLineDash'),
  getLineDash: jasmine.createSpy('getLineDash').and.returnValue([]),
  isPointInPath: jasmine.createSpy('isPointInPath').and.returnValue(false),
  fillText: jasmine.createSpy('fillText'),
  strokeText: jasmine.createSpy('strokeText'),
  setTransform: jasmine.createSpy('setTransform'),
  transform: jasmine.createSpy('transform'),
  translate: jasmine.createSpy('translate'),
  rotate: jasmine.createSpy('rotate'),
  drawImage: jasmine.createSpy('drawImage'),
  roundRect: jasmine.createSpy('roundRect'),
  measureText: jasmine.createSpy('measureText').and.returnValue({
    width: 30, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 2,
  }),
  createLinearGradient: jasmine.createSpy('createLinearGradient').and.returnValue({
    addColorStop: jasmine.createSpy('addColorStop'),
  }),
  createRadialGradient: jasmine.createSpy('createRadialGradient').and.returnValue({
    addColorStop: jasmine.createSpy('addColorStop'),
  }),
  getImageData: jasmine.createSpy('getImageData').and.returnValue({ data: new Uint8ClampedArray(4) }),
  putImageData: jasmine.createSpy('putImageData'),
  // Writable properties Chart.js reads/writes
  fillStyle: '', strokeStyle: '', lineWidth: 1, lineCap: 'butt', lineJoin: 'miter',
  globalAlpha: 1, font: '10px sans-serif', textAlign: 'left', textBaseline: 'alphabetic',
  shadowColor: '', shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
  globalCompositeOperation: 'source-over',
};

// ── Mock data ─────────────────────────────────────────────────────────────────

const mockData: AttendanceOverview = {
  onTime: 80, late: 10, absent: 5, onLeave: 3, remote: 2,
  onTimeTrend: 2, lateTrend: -1, absentTrend: 0, onLeaveTrend: 1, remoteTrend: 0,
  attendanceRate: 85, attendanceRateTrend: 3, totalEmployees: 100,
  weekLabels:          ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  weeklyRates:         [80, 82, 85, 83, 85],
  previousPeriodRates: [75, 78, 80, 79, 81],
  lateSparkline:    [2, 3, 1, 4, 2],
  absentSparkline:  [1, 2, 1, 0, 1],
  onLeaveSparkline: [3, 3, 4, 3, 3],
  remoteSparkline:  [2, 2, 2, 3, 2],
};

const API_URL = `${environment.apiUrl}/dashboard/attendance-overview`;

describe('AttendanceOverviewComponent', () => {
  let component: ComponentFixture<AttendanceOverviewComponent>['componentInstance'];
  let fixture:   ComponentFixture<AttendanceOverviewComponent>;
  let httpMock:  HttpTestingController;

  beforeEach(async () => {
    spyOn(HTMLCanvasElement.prototype, 'getContext').and.returnValue(mockCtx );
    // ← Spy on the real Chart prototype so destroy() is tracked
    spyOn(Chart.prototype, 'destroy').and.callFake(() => {});

    await TestBed.configureTestingModule({
      imports:   [AttendanceOverviewComponent, HttpClientTestingModule],
      schemas:   [NO_ERRORS_SCHEMA],
      providers: [ChangeDetectorRef],
    }).compileComponents();

    httpMock  = TestBed.inject(HttpTestingController);
    fixture   = TestBed.createComponent(AttendanceOverviewComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.verify();
    fixture.destroy();
  });

  // ── Helper: always drain the setTimeout inside load() ─────────────────────

  function init(data = mockData) {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url === API_URL).flush(data);
    tick(0); // drain setTimeout(() => buildAllCharts(), 0)
  }

  // ── Creation & init ───────────────────────────────────────────────────────

  it('should create', fakeAsync(() => {
    init();
    expect(component).toBeTruthy();
  }));

  it('should default activePeriod to "day"', fakeAsync(() => {
    init();
    expect(component.activePeriod).toBe('day');
  }));

  it('should set activePeriod from @Input period', fakeAsync(() => {
    component.period = 'week';
    init();
    expect(component.activePeriod).toBe('week');
  }));

  it('should fall back to "day" for an invalid period input', fakeAsync(() => {
    component.period = 'invalid';
    init();
    expect(component.activePeriod).toBe('day');
  }));

  // ── HTTP request params ───────────────────────────────────────────────────

  it('should request with period=day by default', fakeAsync(() => {
    fixture.detectChanges();
    const req = httpMock.expectOne(r => r.url === API_URL);
    expect(req.request.params.get('period')).toBe('day');
    req.flush(mockData);
    tick(0);
  }));

  it('should request with period=month when input is month', fakeAsync(() => {
    component.period = 'month';
    fixture.detectChanges();
    const req = httpMock.expectOne(r => r.url === API_URL);
    expect(req.request.params.get('period')).toBe('month');
    req.flush(mockData);
    tick(0);
  }));

  it('should include department param when not ALL', fakeAsync(() => {
    component.department = 'ENGINEERING';
    fixture.detectChanges();
    const req = httpMock.expectOne(r => r.url === API_URL);
    expect(req.request.params.get('department')).toBe('ENGINEERING');
    req.flush(mockData);
    tick(0);
  }));

  it('should not include department param when ALL', fakeAsync(() => {
    component.department = 'ALL';
    fixture.detectChanges();
    const req = httpMock.expectOne(r => r.url === API_URL);
    expect(req.request.params.has('department')).toBeFalse();
    req.flush(mockData);
    tick(0);
  }));

  it('should use period=specific and include date when specificDate is set', fakeAsync(() => {
    component.specificDate = new Date(2026, 0, 15);
    fixture.detectChanges();
    const req = httpMock.expectOne(r => r.url === API_URL);
    expect(req.request.params.get('period')).toBe('specific');
    expect(req.request.params.get('date')).toBe('2026-01-15');
    req.flush(mockData);
    tick(0);
  }));

  // ── Loading & error states ────────────────────────────────────────────────

  it('should set loading=true while request is pending', fakeAsync(() => {
    fixture.detectChanges();
    expect(component.loading).toBeTrue();
    httpMock.expectOne(r => r.url === API_URL).flush(mockData);
    tick(0);
  }));

  it('should set loading=false and populate data on success', fakeAsync(() => {
    init();
    expect(component.loading).toBeFalse();
    expect(component.error).toBeFalse();
    expect(component.data).toEqual(mockData);
  }));

  it('should set error=true and loading=false on HTTP error', fakeAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url === API_URL)
      .flush('error', { status: 500, statusText: 'Server Error' });
    tick(0);
    expect(component.error).toBeTrue();
    expect(component.loading).toBeFalse();
  }));

  // ── setPeriod ─────────────────────────────────────────────────────────────

  it('should update activePeriod and reload when setPeriod is called', fakeAsync(() => {
    init();
    component.setPeriod('month');
    const req = httpMock.expectOne(r => r.url === API_URL);
    expect(req.request.params.get('period')).toBe('month');
    req.flush(mockData);
    tick(0);
    expect(component.activePeriod).toBe('month');
  }));

  it('should emit periodChange when period changes', fakeAsync(() => {
    init();
    const emitted: Period[] = [];
    component.periodChange.subscribe((p: Period) => emitted.push(p));

    component.setPeriod('year');
    httpMock.expectOne(r => r.url === API_URL).flush(mockData);
    tick(0);

    expect(emitted).toContain('year');
  }));

  it('should not reload when setPeriod is called with the current period', fakeAsync(() => {
    init();
    component.setPeriod('day'); // same — no reload
    httpMock.expectNone(r => r.url === API_URL);
    expect(component.activePeriod).toBe('day'); // explicit expectation
  }));

  // ── ngOnChanges ───────────────────────────────────────────────────────────

  it('should reload when period input changes', fakeAsync(() => {
    init();
    // ← Must update component.period BEFORE calling ngOnChanges
    component.period = 'week';
    component.ngOnChanges({ period: new SimpleChange('day', 'week', false) });
    const req = httpMock.expectOne(r => r.url === API_URL);
    expect(req.request.params.get('period')).toBe('week');
    req.flush(mockData);
    tick(0);
    expect(component.activePeriod).toBe('week');
  }));

  it('should reload when department input changes', fakeAsync(() => {
    init();
    component.department = 'HR';
    component.ngOnChanges({ department: new SimpleChange('ALL', 'HR', false) });
    const req = httpMock.expectOne(r => r.url === API_URL);
    expect(req.request.params.get('department')).toBe('HR');
    req.flush(mockData);
    tick(0);
  }));

  it('should NOT reload on firstChange', fakeAsync(() => {
    init();
    component.ngOnChanges({ period: new SimpleChange(null, 'week', true) });
    httpMock.expectNone(r => r.url === API_URL);
    expect(component.activePeriod).toBe('day'); // explicit expectation
  }));

  // ── Derived getters ───────────────────────────────────────────────────────

  describe('compareLabel', () => {
    beforeEach(fakeAsync(() => { init(); }));

    it('should return "vs yesterday" for day', () => {
      component.activePeriod = 'day';
      expect(component.compareLabel).toBe('vs yesterday');
    });

    it('should return "vs last week" for week', () => {
      component.activePeriod = 'week';
      expect(component.compareLabel).toBe('vs last week');
    });

    it('should return "vs last month" for month', () => {
      component.activePeriod = 'month';
      expect(component.compareLabel).toBe('vs last month');
    });

    it('should return "vs last year" for year', () => {
      component.activePeriod = 'year';
      expect(component.compareLabel).toBe('vs last year');
    });

    it('should return "for selected date" when specificDate is set', () => {
      component.specificDate = new Date();
      expect(component.compareLabel).toBe('for selected date');
    });
  });

  describe('activePeriodLabel', () => {
    beforeEach(fakeAsync(() => { init(); }));

    it('should return "Today" for day',        () => { component.activePeriod = 'day';   expect(component.activePeriodLabel).toBe('Today');      });
    it('should return "This week" for week',   () => { component.activePeriod = 'week';  expect(component.activePeriodLabel).toBe('This week');  });
    it('should return "This month" for month', () => { component.activePeriod = 'month'; expect(component.activePeriodLabel).toBe('This month'); });
    it('should return "This year" for year',   () => { component.activePeriod = 'year';  expect(component.activePeriodLabel).toBe('This year');  });
  });

  describe('needAttention', () => {
    beforeEach(fakeAsync(() => { init(); }));

    it('should return late + absent', () => {
      expect(component.needAttention).toBe(15);
    });

    it('should return 0 when data is not loaded', () => {
      (component as any).data = null;
      expect(component.needAttention).toBe(0);
    });
  });

  describe('needAttentionPct', () => {
    beforeEach(fakeAsync(() => { init(); }));

    it('should calculate percentage of total employees', () => {
      expect(component.needAttentionPct).toBe('15.0');
    });

    it('should return "0" when totalEmployees is 0', () => {
      component.data = { ...mockData, totalEmployees: 0 };
      expect(component.needAttentionPct).toBe('0');
    });
  });

  describe('insightText', () => {
    beforeEach(fakeAsync(() => { init(); }));

    it('should return empty string when data is not loaded', () => {
      (component as any).data = null;
      expect(component.insightText).toBe('');
    });

    it('should return positive trend message when trend > 0', () => {
      component.data = { ...mockData, attendanceRateTrend: 5 };
      expect(component.insightText).toContain('5%');
      expect(component.insightText).toContain('higher');
    });

    it('should return negative trend message when trend < 0', () => {
      component.data = { ...mockData, attendanceRateTrend: -3 };
      expect(component.insightText).toContain('3%');
      expect(component.insightText).toContain('dropped');
    });

    it('should return stable message when trend is 0', () => {
      component.data = { ...mockData, attendanceRateTrend: 0 };
      expect(component.insightText).toContain('stable');
    });
  });

  describe('trendUp / trendDown', () => {
    beforeEach(fakeAsync(() => { init(); }));

    it('trendUp returns true only for positive values', () => {
      expect(component.trendUp(1)).toBeTrue();
      expect(component.trendUp(0)).toBeFalse();
      expect(component.trendUp(-1)).toBeFalse();
    });

    it('trendDown returns true only for negative values', () => {
      expect(component.trendDown(-1)).toBeTrue();
      expect(component.trendDown(0)).toBeFalse();
      expect(component.trendDown(1)).toBeFalse();
    });
  });

  // ── Chart lifecycle ───────────────────────────────────────────────────────

 it('should destroy existing charts before building new ones on reload', fakeAsync(() => {
  init();

  // Inject a fake chart directly — no need for Chart.js to construct
  const fakeChart = { destroy: jasmine.createSpy('destroy') };
  (component as any).charts.push(fakeChart);

  component.setPeriod('week');
  httpMock.expectOne(r => r.url === API_URL).flush(mockData);
  tick(0);

  expect(fakeChart.destroy).toHaveBeenCalled();
}));

it('should destroy all charts on ngOnDestroy', fakeAsync(() => {
  init();

  const fakeChart = { destroy: jasmine.createSpy('destroy') };
  (component as any).charts.push(fakeChart);

  component.ngOnDestroy();

  expect(fakeChart.destroy).toHaveBeenCalled();
  expect((component as any).charts.length).toBe(0);
}));
});