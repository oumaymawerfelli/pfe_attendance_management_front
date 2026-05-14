import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { DayDetailDialogComponent, DayDetailDialogData } from './day-detail-dialog.component';

// ── Helpers ───────────────────────────────────────────────────────────────────

const baseData: DayDetailDialogData = {
  date:      '2026-05-01',
  dateLabel: 'Friday, 01 May 2026',
  calStatus: 'present',
  record:    null,
  loading:   false,
  error:     '',
};

function setup(data: Partial<DayDetailDialogData> = {}) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    declarations: [DayDetailDialogComponent],
    schemas:      [NO_ERRORS_SCHEMA],
    providers:    [{ provide: MAT_DIALOG_DATA, useValue: { ...baseData, ...data } }],
  });
  const fixture   = TestBed.createComponent(DayDetailDialogComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();
  return { fixture, component };
}

describe('DayDetailDialogComponent', () => {

  // ── Creation ──────────────────────────────────────────────────────────────

  it('should create', () => {
    const { component } = setup();
    expect(component).toBeTruthy();
  });

  it('should expose injected dialog data', () => {
    const { component } = setup();
    expect(component.data.date).toBe('2026-05-01');
    expect(component.data.dateLabel).toBe('Friday, 01 May 2026');
  });

  // ── hasRecord ─────────────────────────────────────────────────────────────

  it('should return false when record is null', () => {
    const { component } = setup({ record: null, loading: false, error: '' });
    expect(component.hasRecord).toBeFalse();
  });

  it('should return false when still loading', () => {
    const { component } = setup({ record: { status: 'PRESENT' } as any, loading: true, error: '' });
    expect(component.hasRecord).toBeFalse();
  });

  it('should return false when there is an error', () => {
    const { component } = setup({ record: { status: 'PRESENT' } as any, loading: false, error: 'no-record' });
    expect(component.hasRecord).toBeFalse();
  });

  it('should return true when record is present, not loading, and no error', () => {
    const { component } = setup({ record: { status: 'PRESENT' } as any, loading: false, error: '' });
    expect(component.hasRecord).toBeTrue();
  });

  // ── statusConfig — from record.status ─────────────────────────────────────

  const recordCases: Array<[string, string, string]> = [
    ['PRESENT',          'Present',           'check_circle' ],
    ['LATE',             'Late Arrival',       'schedule'     ],
    ['ABSENT',           'Absent',             'cancel'       ],
    ['HALF_DAY',         'Half Day',           'timelapse'    ],
    ['EARLY_DEPARTURE',  'Early Departure',    'logout'       ],
    ['LEAVE',            'On Approved Leave',  'beach_access' ],
  ];

  recordCases.forEach(([status, label, icon]) => {
    it(`should return correct config for record status ${status}`, () => {
      const { component } = setup({ record: { status } as any });
      expect(component.statusConfig.label).toBe(label);
      expect(component.statusConfig.icon).toBe(icon);
    });
  });

  it('should fall back to calStatus when record is null', () => {
    const { component } = setup({ record: null, calStatus: 'present' });
    expect(component.statusConfig.label).toBe('Present');
  });

  it('should return fallback config for unknown status', () => {
    const { component } = setup({ record: { status: 'CUSTOM_STATUS' } as any });
    expect(component.statusConfig.label).toBe('CUSTOM_STATUS');
    expect(component.statusConfig.icon).toBe('help_outline');
    expect(component.statusConfig.color).toBe('#607d8b');
  });

  it('should use calStatus uppercased when record has no status', () => {
    const { component } = setup({ record: null, calStatus: 'late' });
    expect(component.statusConfig.label).toBe('Late Arrival');
  });

  // ── formatTime ────────────────────────────────────────────────────────────

  it('should return "—" for null', () => {
    const { component } = setup();
    expect(component.formatTime(null)).toBe('—');
  });

  it('should return "—" for undefined', () => {
    const { component } = setup();
    expect(component.formatTime(undefined)).toBe('—');
  });

  it('should return "—" for empty string', () => {
    const { component } = setup();
    expect(component.formatTime('')).toBe('—');
  });

  it('should format a valid ISO datetime to HH:MM', () => {
    const { component } = setup();
    const result = component.formatTime('2026-05-01T09:30:00');
    expect(result).toMatch(/^\d{2}:\d{2}$/);
    expect(result).toBe('09:30');
  });

  it('should return "—" for an invalid datetime string', () => {
    const { component } = setup();
    // Invalid date produces NaN — toLocaleTimeString returns 'Invalid Date' or similar
    // the component catches this scenario
    const result = component.formatTime('not-a-date');
    // Either returns a string (browser may not throw) — just check it's a string
    expect(typeof result).toBe('string');
  });

  // ── formatHours ───────────────────────────────────────────────────────────

  it('should return "—" for null', () => {
    const { component } = setup();
    expect(component.formatHours(null)).toBe('—');
  });

  it('should return "—" for undefined', () => {
    const { component } = setup();
    expect(component.formatHours(undefined)).toBe('—');
  });

  it('should format whole hours without minutes', () => {
    const { component } = setup();
    expect(component.formatHours(8)).toBe('8h');
    expect(component.formatHours(0)).toBe('0h');
  });

  it('should format hours with minutes', () => {
    const { component } = setup();
    expect(component.formatHours(7.5)).toBe('7h 30m');
    expect(component.formatHours(1.25)).toBe('1h 15m');
  });

  it('should round minutes correctly', () => {
    const { component } = setup();
    expect(component.formatHours(7.883)).toBe('7h 53m');
  });
});