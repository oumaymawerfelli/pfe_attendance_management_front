import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA }          from '@angular/core';
import { of, throwError, Subject }   from 'rxjs';

import { LeaveBalanceCardsComponent } from './leave-balance-cards.component';
import { LeaveService }               from '../../services/leave.service';
import { LeaveSummary }               from '../../models/leave.model';

// ── Mock data ──────────────────────────────────────────────────────────────────

const mockSummary: LeaveSummary = {
  annualTotal:     20,
  annualTaken:     5,
  annualRemaining: 15,
  sickTotal:       10,
  sickTaken:       2,
  sickRemaining:   8,
  unpaidTotal:     0,
  unpaidTaken:     0,
  unpaidRemaining: 0,
  workflow:        [],
};

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('LeaveBalanceCardsComponent', () => {
  let component: LeaveBalanceCardsComponent;
  let fixture:   ComponentFixture<LeaveBalanceCardsComponent>;
  let leaveSpy:  jasmine.SpyObj<LeaveService>;

  beforeEach(async () => {
    leaveSpy = jasmine.createSpyObj('LeaveService', ['getSummary']);
    leaveSpy.getSummary.and.returnValue(of(mockSummary));

    await TestBed.configureTestingModule({
      declarations: [LeaveBalanceCardsComponent],
      schemas:      [NO_ERRORS_SCHEMA],
      providers:    [{ provide: LeaveService, useValue: leaveSpy }],
    }).compileComponents();

    fixture   = TestBed.createComponent(LeaveBalanceCardsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();   // triggers ngOnInit → load()
  });

  afterEach(() => fixture.destroy());

  // ── Creation & init ───────────────────────────────────────────────────────

  describe('creation & init', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should call getSummary once on init', () => {
      expect(leaveSpy.getSummary).toHaveBeenCalledTimes(1);
    });

    it('should populate summary after successful load', () => {
      expect(component.summary).toEqual(mockSummary);
    });

    it('should set loading=false after successful load', () => {
      expect(component.loading).toBeFalse();
    });

    it('should set loading=false on error', () => {
      leaveSpy.getSummary.and.returnValue(throwError(() => new Error('fail')));
      component.ngOnInit();
      expect(component.loading).toBeFalse();
    });

    it('should leave summary null on error', () => {
      // Reset summary to verify it stays null on a failed load
      component.summary = null;
      leaveSpy.getSummary.and.returnValue(throwError(() => new Error('fail')));
      component.ngOnInit();
      expect(component.summary).toBeNull();
    });

    it('should set loading=true before the observable emits', () => {
      const pending$ = new Subject<LeaveSummary>();
      leaveSpy.getSummary.and.returnValue(pending$.asObservable());
      component.ngOnInit();
      expect(component.loading).toBeTrue();
    });
  });

  // ── refresh() ─────────────────────────────────────────────────────────────

  describe('refresh()', () => {
    it('should call getSummary again', () => {
      leaveSpy.getSummary.calls.reset();
      component.refresh();
      expect(leaveSpy.getSummary).toHaveBeenCalledTimes(1);
    });

    it('should update summary with fresh data', () => {
      const updated: LeaveSummary = {
        ...mockSummary,
        annualRemaining: 10,
        annualTaken:     10,
      };
      leaveSpy.getSummary.and.returnValue(of(updated));
      component.refresh();
      expect(component.summary).toEqual(updated);
    });

    it('should set loading=false after refresh succeeds', () => {
      component.refresh();
      expect(component.loading).toBeFalse();
    });

    it('should set loading=false after refresh fails', () => {
      leaveSpy.getSummary.and.returnValue(throwError(() => new Error('fail')));
      component.refresh();
      expect(component.loading).toBeFalse();
    });

    it('should be callable multiple times without error', () => {
      expect(() => {
        component.refresh();
        component.refresh();
        component.refresh();
      }).not.toThrow();
    });
  });

  // ── annualPct() ───────────────────────────────────────────────────────────

  describe('annualPct()', () => {
    it('should return 0 when summary is null', () => {
      component.summary = null;
      expect(component.annualPct()).toBe(0);
    });

    it('should return 0 when annualTotal is 0 (avoid divide-by-zero)', () => {
      component.summary = { ...mockSummary, annualTotal: 0, annualRemaining: 0 };
      expect(component.annualPct()).toBe(0);
    });

    it('should return 75 when 15 of 20 days remain', () => {
      // mockSummary: annualRemaining=15, annualTotal=20 → 75%
      expect(component.annualPct()).toBe(75);
    });

    it('should return 100 when all days remain', () => {
      component.summary = { ...mockSummary, annualRemaining: 20, annualTotal: 20 };
      expect(component.annualPct()).toBe(100);
    });

    it('should return 0 when all days are taken', () => {
      component.summary = { ...mockSummary, annualRemaining: 0, annualTotal: 20 };
      expect(component.annualPct()).toBe(0);
    });

    it('should return 50 when half the days remain', () => {
      component.summary = { ...mockSummary, annualRemaining: 10, annualTotal: 20 };
      expect(component.annualPct()).toBe(50);
    });
  });

  // ── sickPct() ─────────────────────────────────────────────────────────────

  describe('sickPct()', () => {
    it('should return 0 when summary is null', () => {
      component.summary = null;
      expect(component.sickPct()).toBe(0);
    });

    it('should return 0 when sickTotal is 0 (avoid divide-by-zero)', () => {
      component.summary = { ...mockSummary, sickTotal: 0, sickRemaining: 0 };
      expect(component.sickPct()).toBe(0);
    });

    it('should return 80 when 8 of 10 days remain', () => {
      // mockSummary: sickRemaining=8, sickTotal=10 → 80%
      expect(component.sickPct()).toBe(80);
    });

    it('should return 100 when all sick days remain', () => {
      component.summary = { ...mockSummary, sickRemaining: 10, sickTotal: 10 };
      expect(component.sickPct()).toBe(100);
    });

    it('should return 0 when all sick days are taken', () => {
      component.summary = { ...mockSummary, sickRemaining: 0, sickTotal: 10 };
      expect(component.sickPct()).toBe(0);
    });

    it('should return 50 when half the sick days remain', () => {
      component.summary = { ...mockSummary, sickRemaining: 5, sickTotal: 10 };
      expect(component.sickPct()).toBe(50);
    });
  });
});