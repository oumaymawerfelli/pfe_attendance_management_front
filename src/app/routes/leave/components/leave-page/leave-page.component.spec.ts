import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA }   from '@angular/core';
import { MatSnackBar }        from '@angular/material/snack-bar';

import { LeavePageComponent }         from './leave-page.component';
import { LeaveBalanceCardsComponent } from '../balance-cards/leave-balance-cards.component';
import { LeaveHistoryComponent }      from '../history/leave-history.component';

describe('LeavePageComponent', () => {
  let component: LeavePageComponent;
  let fixture:   ComponentFixture<LeavePageComponent>;
  let snackSpy:  jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    snackSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      declarations: [LeavePageComponent],
      schemas:      [NO_ERRORS_SCHEMA],          // ignore child component templates
      providers:    [{ provide: MatSnackBar, useValue: snackSpy }],
    }).compileComponents();

    fixture   = TestBed.createComponent(LeavePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  // ── Creation ──────────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start on tab 0 (Request form)', () => {
    expect(component.activeTab).toBe(0);
  });

  // ── onLeaveSubmitted ──────────────────────────────────────────────────────

  it('onLeaveSubmitted() should switch activeTab to 1', () => {
    component.onLeaveSubmitted();
    expect(component.activeTab).toBe(1);
  });

  it('onLeaveSubmitted() should call balanceCards.refresh() after one tick', fakeAsync(() => {
    const mockCards = jasmine.createSpyObj<LeaveBalanceCardsComponent>('LeaveBalanceCardsComponent', ['refresh']);
    component.balanceCards = mockCards;

    component.onLeaveSubmitted();
    expect(mockCards.refresh).not.toHaveBeenCalled(); // not yet — inside setTimeout

    tick(0);
    expect(mockCards.refresh).toHaveBeenCalledOnceWith();
  }));

  it('onLeaveSubmitted() should call leaveHistory.refresh() after one tick', fakeAsync(() => {
    const mockHistory = jasmine.createSpyObj<LeaveHistoryComponent>('LeaveHistoryComponent', ['refresh']);
    component.leaveHistory = mockHistory;

    component.onLeaveSubmitted();
    tick(0);
    expect(mockHistory.refresh).toHaveBeenCalledOnceWith();
  }));

  it('onLeaveSubmitted() should not throw when balanceCards is undefined', fakeAsync(() => {
    component.balanceCards = undefined;
    component.leaveHistory = undefined;
    expect(() => { component.onLeaveSubmitted(); tick(0); }).not.toThrow();
  }));

  it('onLeaveSubmitted() should not throw when leaveHistory is undefined', fakeAsync(() => {
    component.leaveHistory = undefined;
    expect(() => { component.onLeaveSubmitted(); tick(0); }).not.toThrow();
  }));

  // ── onDraftSaved ──────────────────────────────────────────────────────────

  it('onDraftSaved() should open a snack bar with the correct message', () => {
    component.onDraftSaved();
    expect(snackSpy.open).toHaveBeenCalledOnceWith(
      'Draft saved — you can continue anytime from My Requests.',
      'OK',
      { duration: 5000, horizontalPosition: 'right', verticalPosition: 'bottom' },
    );
  });

  it('onDraftSaved() should NOT change the active tab', () => {
    component.activeTab = 0;
    component.onDraftSaved();
    expect(component.activeTab).toBe(0);
  });

  // ── goToRequests ──────────────────────────────────────────────────────────

  it('goToRequests() should set activeTab to 1', () => {
    component.activeTab = 0;
    component.goToRequests();
    expect(component.activeTab).toBe(1);
  });

  it('goToRequests() should be idempotent when already on tab 1', () => {
    component.activeTab = 1;
    component.goToRequests();
    expect(component.activeTab).toBe(1);
  });

  // ── goToForm ──────────────────────────────────────────────────────────────

  it('goToForm() should set activeTab to 0', () => {
    component.activeTab = 1;
    component.goToForm();
    expect(component.activeTab).toBe(0);
  });

  it('goToForm() should be idempotent when already on tab 0', () => {
    component.activeTab = 0;
    component.goToForm();
    expect(component.activeTab).toBe(0);
  });

  // ── Tab round-trips ───────────────────────────────────────────────────────

  it('should navigate Request → History → Request correctly', () => {
    expect(component.activeTab).toBe(0);
    component.goToRequests();
    expect(component.activeTab).toBe(1);
    component.goToForm();
    expect(component.activeTab).toBe(0);
  });
});