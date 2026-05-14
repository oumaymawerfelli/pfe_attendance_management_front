import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ClockComponent } from './clock.component';

describe('ClockComponent', () => {
  let component: ClockComponent;
  let fixture: ComponentFixture<ClockComponent>;
  let mockCtx: jasmine.SpyObj<CanvasRenderingContext2D>;

  beforeEach(() => {
    // jsdom does not implement Canvas — mock the 2D context
    mockCtx = jasmine.createSpyObj<CanvasRenderingContext2D>('CanvasRenderingContext2D', [
      'clearRect', 'beginPath', 'arc', 'moveTo', 'lineTo',
      'stroke', 'fill', 'createLinearGradient',
    ]);

    mockCtx.createLinearGradient.and.returnValue({
      addColorStop: jasmine.createSpy('addColorStop'),
    } as unknown as CanvasGradient);

    spyOn(HTMLCanvasElement.prototype, 'getContext').and.returnValue(mockCtx as unknown as RenderingContext);

    TestBed.configureTestingModule({
      imports: [ClockComponent],
    });

    fixture = TestBed.createComponent(ClockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // triggers ngOnInit + ngAfterViewInit
  });

  afterEach(() => {
    fixture.destroy(); // calls ngOnDestroy → clears the interval
  });

  // ── Creation ─────────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── Initial state ─────────────────────────────────────────────────────────

  it('should initialise hours and minutes as zero-padded strings', () => {
    expect(component.hours).toMatch(/^\d{2}$/);
    expect(component.minutes).toMatch(/^\d{2}$/);
  });

  it('should initialise dateStr in the expected format', () => {
    const dayPattern   = '(SUN|MON|TUE|WED|THU|FRI|SAT)';
    const monthPattern = '(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)';
    expect(component.dateStr).toMatch(
      new RegExp(`^${dayPattern} ${monthPattern} \\d{1,2} \\d{4}$`)
    );
  });

  // ── Canvas ────────────────────────────────────────────────────────────────

  it('should call getContext("2d") to draw the analog clock', () => {
    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith('2d');
  });

  it('should draw on the canvas context after init', () => {
    expect(mockCtx.clearRect).toHaveBeenCalled();
    expect(mockCtx.beginPath).toHaveBeenCalled();
    expect(mockCtx.stroke).toHaveBeenCalled();
  });

  // ── Interval / live updates ───────────────────────────────────────────────

  it('should update time values when tick() is called', () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2026, 0, 1, 10, 0, 0)); // 10:00:00

    (component as any).tick();
    expect(component.hours).toBe('10');
    expect(component.minutes).toBe('00');

    jasmine.clock().mockDate(new Date(2026, 0, 1, 10, 1, 0)); // 10:01:00
    (component as any).tick();
    expect(component.minutes).toBe('01');

    jasmine.clock().uninstall();
  });

  it('should redraw the canvas on each tick', () => {
    const callsBefore = (mockCtx.clearRect as jasmine.Spy).calls.count();

    (component as any).tick();

    expect((mockCtx.clearRect as jasmine.Spy).calls.count()).toBeGreaterThan(callsBefore);
  });

  it('should clear the interval on destroy', fakeAsync(() => {
    spyOn(window, 'clearInterval').and.callThrough();
    fixture.destroy();
    expect(window.clearInterval).toHaveBeenCalled();
    tick(); // drain any remaining async tasks
  }));

  // ── Helpers ───────────────────────────────────────────────────────────────

  it('should pad single-digit numbers with a leading zero', () => {
    const pad = (component as any).pad.bind(component) as (n: number) => string;
    expect(pad(0)).toBe('00');
    expect(pad(5)).toBe('05');
    expect(pad(10)).toBe('10');
  });
});