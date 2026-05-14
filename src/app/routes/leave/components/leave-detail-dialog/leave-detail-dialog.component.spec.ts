import {
  ComponentFixture, TestBed,
  fakeAsync, tick,
} from '@angular/core/testing';
import { NO_ERRORS_SCHEMA }    from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError, Subject } from 'rxjs';

import { LeaveDetailDialogComponent }         from './leave-detail-dialog.component';
import { LeaveDetailDialogData }              from './leave-detail-dialog.component';
import { LeaveService }                       from '../../services/leave.service';
import { AuthService }                        from '@core/authentication/auth.service';
import {
  LeaveRecord, LeaveStatus, LeaveType,
  LEAVE_STATUS_CONFIG, LEAVE_TYPE_OPTIONS,
} from '../../models/leave.model';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeLeave(status: LeaveStatus = LeaveStatus.PENDING): LeaveRecord {
  return {
    id:               1,
    status,
    leaveType:        LeaveType.ANNUAL,
    startDate:        '2026-06-01',
    endDate:          '2026-06-05',
    reason:           'Vacation',
    userId:           42,
    userFullName:     'Test User',
    userDepartment:   'Engineering',
    daysCount:        5,
  } as unknown as LeaveRecord;
}

function makeDialogData(
  overrides: Partial<LeaveDetailDialogData> = {},
): LeaveDetailDialogData {
  return {
    leave: makeLeave(),
    mode:  'decide',
    isPM:  false,
    ...overrides,
  };
}

// ── Fake SignaturePad (replaces the real canvas library) ──────────────────────

class FakeSignaturePad {
  private _empty = true;
  clear()       { this._empty = true; }
  isEmpty()     { return this._empty; }
  toDataURL()   { return 'data:image/png;base64,FAKE'; }
  /** Helper: simulate the user drawing something */
  draw()        { this._empty = false; }
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('LeaveDetailDialogComponent', () => {
  let component:  LeaveDetailDialogComponent;
  let fixture:    ComponentFixture<LeaveDetailDialogComponent>;
  let leaveSpy:   jasmine.SpyObj<LeaveService>;
  let authSpy:    jasmine.SpyObj<AuthService>;
  let dialogSpy:  jasmine.SpyObj<MatDialogRef<LeaveDetailDialogComponent>>;
  let fakeSignaturePad: FakeSignaturePad;

  const mockUser = {
    firstName: 'Alice',
    lastName:  'Manager',
    roles:     ['GENERAL_MANAGER'],
  };

  function setup(data: LeaveDetailDialogData = makeDialogData()): void {
    // Must reset before re-configuring when setup() is called mid-test
    // (e.g. to switch isPM / mode / user). Without this Angular throws
    // "Cannot configure the test module when it has already been instantiated."
    fixture?.destroy();
    TestBed.resetTestingModule();

    leaveSpy  = jasmine.createSpyObj('LeaveService', [
      'approveLeave', 'approveTeamLeave',
      'rejectLeave',  'rejectTeamLeave',
      'generateDocument', 'openDocument',
    ]);
    authSpy   = jasmine.createSpyObj('AuthService', ['user']);
    dialogSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    authSpy.user.and.returnValue(of(mockUser));

    // Default happy-path stubs
    leaveSpy.approveLeave.and.returnValue(of(data.leave));
    leaveSpy.approveTeamLeave.and.returnValue(of(data.leave));
    leaveSpy.rejectLeave.and.returnValue(of({ ...data.leave, status: LeaveStatus.REJECTED } as LeaveRecord));
    leaveSpy.rejectTeamLeave.and.returnValue(of({ ...data.leave, status: LeaveStatus.REJECTED } as LeaveRecord));
    leaveSpy.generateDocument.and.returnValue(of(void 0));

    TestBed.configureTestingModule({
      declarations: [LeaveDetailDialogComponent],
      imports:      [ReactiveFormsModule],
      schemas:      [NO_ERRORS_SCHEMA],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef,    useValue: dialogSpy },
        { provide: LeaveService,    useValue: leaveSpy },
        { provide: AuthService,     useValue: authSpy },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(LeaveDetailDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Inject fake signature pad so we don't need a real canvas
    fakeSignaturePad = new FakeSignaturePad();
    (component as any).signaturePad = fakeSignaturePad;
  }

  afterEach(() => fixture?.destroy());

  // ── Creation & init ───────────────────────────────────────────────────────

  describe('creation & init', () => {
    beforeEach(() => setup());

    it('should create', () => expect(component).toBeTruthy());

    it('should assign leave, mode and isPM from dialog data', () => {
      expect(component.leave.id).toBe(1);
      expect(component.mode).toBe('decide');
      expect(component.isPM).toBeFalse();
    });

    it('should default mode to "view" when not provided', () => {
      setup(makeDialogData({ mode: undefined as any }));
      expect(component.mode).toBe('view');
    });

    it('should default isPM to false when not provided', () => {
      setup(makeDialogData({ isPM: undefined }));
      expect(component.isPM).toBeFalse();
    });

    it('should start on the "review" step', () => {
      expect(component.step).toBe('review');
    });

    it('should populate approverFullName from auth user', () => {
      expect(component.approverFullName).toBe('Alice Manager');
    });

    it('should format approverRole correctly', () => {
      expect(component.approverRole).toBe('General Manager');
    });

    it('should trim approverFullName when lastName is missing', () => {
      // setup() creates a fresh authSpy — configure it AFTER, then re-init
      setup();
      authSpy.user.and.returnValue(of({ firstName: 'Bob', roles: [] }));
      component.ngOnInit();
      expect(component.approverFullName).toBe('Bob');
    });

    it('should handle ROLE_ prefix in role names', () => {
      // setup() creates a fresh authSpy — configure it AFTER, then re-init
      setup();
      authSpy.user.and.returnValue(of({ firstName: 'X', lastName: 'Y', roles: ['ROLE_ADMIN'] }));
      component.ngOnInit();
      expect(component.approverRole).toBe('Administrator');
    });
  });

  // ── canDecide ─────────────────────────────────────────────────────────────

  describe('canDecide', () => {
    it('should be true in decide mode with PENDING status', () => {
      setup(makeDialogData({ mode: 'decide', leave: makeLeave(LeaveStatus.PENDING) }));
      expect(component.canDecide).toBeTrue();
    });

    it('should be true for PENDING_TEAM_LEAD', () => {
      setup(makeDialogData({ leave: makeLeave(LeaveStatus.PENDING_TEAM_LEAD) }));
      expect(component.canDecide).toBeTrue();
    });

    it('should be true for PENDING_HR', () => {
      setup(makeDialogData({ leave: makeLeave(LeaveStatus.PENDING_HR) }));
      expect(component.canDecide).toBeTrue();
    });

    it('should be true for PENDING_GM', () => {
      setup(makeDialogData({ leave: makeLeave(LeaveStatus.PENDING_GM) }));
      expect(component.canDecide).toBeTrue();
    });

    it('should be false in view mode even with a pending status', () => {
      setup(makeDialogData({ mode: 'view', leave: makeLeave(LeaveStatus.PENDING) }));
      expect(component.canDecide).toBeFalse();
    });

    it('should be false when leave is APPROVED', () => {
      setup(makeDialogData({ leave: makeLeave(LeaveStatus.APPROVED) }));
      expect(component.canDecide).toBeFalse();
    });

    it('should be false when leave is REJECTED', () => {
      setup(makeDialogData({ leave: makeLeave(LeaveStatus.REJECTED) }));
      expect(component.canDecide).toBeFalse();
    });
  });

  // ── Step navigation ───────────────────────────────────────────────────────

  describe('step navigation', () => {
    beforeEach(() => setup());

    it('goToSign() should switch step to "sign"', fakeAsync(() => {
      component.goToSign();
      tick(60);
      expect(component.step).toBe('sign');
    }));

    it('goToSign() should clear error', fakeAsync(() => {
      component.error = 'some error';
      component.goToSign();
      tick(60);
      expect(component.error).toBe('');
    }));

    it('backToReview() should switch step back to "review"', fakeAsync(() => {
      component.goToSign();
      tick(60);
      component.backToReview();
      expect(component.step).toBe('review');
    }));

    it('backToReview() should reset rejecting and error', () => {
      component.rejecting = true;
      component.error     = 'oops';
      component.backToReview();
      expect(component.rejecting).toBeFalse();
      expect(component.error).toBe('');
    });
  });

  // ── Signature helpers ─────────────────────────────────────────────────────

  describe('clearSignature', () => {
    beforeEach(() => setup());

    it('should call clear() on the signature pad', () => {
      spyOn(fakeSignaturePad, 'clear');
      component.clearSignature();
      expect(fakeSignaturePad.clear).toHaveBeenCalled();
    });

    it('should not throw when signaturePad is undefined', () => {
      (component as any).signaturePad = undefined;
      expect(() => component.clearSignature()).not.toThrow();
    });
  });

  // ── confirmApprove ────────────────────────────────────────────────────────

  describe('confirmApprove', () => {
    beforeEach(() => setup());

    it('should set error when signature is empty', () => {
      // fakeSignaturePad.isEmpty() returns true by default
      component.confirmApprove();
      expect(component.error).toBe('Please draw your signature before approving.');
      expect(leaveSpy.approveLeave).not.toHaveBeenCalled();
    });

    it('should call approveLeave (non-PM) on valid signature', () => {
      fakeSignaturePad.draw();
      component.confirmApprove();
      expect(leaveSpy.approveLeave).toHaveBeenCalledWith(1);
    });

    it('should call approveTeamLeave when isPM=true', () => {
      setup(makeDialogData({ isPM: true }));
      (component as any).signaturePad = fakeSignaturePad;
      fakeSignaturePad.draw();
      component.confirmApprove();
      expect(leaveSpy.approveTeamLeave).toHaveBeenCalledWith(1);
      expect(leaveSpy.approveLeave).not.toHaveBeenCalled();
    });

    it('should call generateDocument after approval', () => {
      fakeSignaturePad.draw();
      component.confirmApprove();
      expect(leaveSpy.generateDocument).toHaveBeenCalled();
    });

    it('should call openDocument and close dialog on success', () => {
      fakeSignaturePad.draw();
      component.confirmApprove();
      expect(leaveSpy.openDocument).toHaveBeenCalledWith(1);
      expect(dialogSpy.close).toHaveBeenCalledWith(
        jasmine.objectContaining({ action: 'approved' })
      );
    });

    it('should set error and clear saving flag on approval failure', () => {
      leaveSpy.approveLeave.and.returnValue(
        throwError(() => ({ error: { message: 'Server error' } }))
      );
      fakeSignaturePad.draw();
      component.confirmApprove();
      expect(component.error).toBe('Server error');
      expect(component.saving).toBeFalse();
    });

    it('should use fallback error message when error has no message', () => {
      leaveSpy.approveLeave.and.returnValue(throwError(() => ({})));
      fakeSignaturePad.draw();
      component.confirmApprove();
      expect(component.error).toBe('Approval failed. Please try again.');
    });

    it('should set saving=true while the request is in-flight', () => {
      const subject = new Subject<LeaveRecord>();
      leaveSpy.approveLeave.and.returnValue(subject.asObservable());
      fakeSignaturePad.draw();
      component.confirmApprove();
      expect(component.saving).toBeTrue();
    });
  });

  // ── Reject flow ───────────────────────────────────────────────────────────

  describe('showRejectForm / confirmReject', () => {
    beforeEach(() => setup());

    it('showRejectForm() should set rejecting=true', () => {
      component.showRejectForm();
      expect(component.rejecting).toBeTrue();
    });

    it('confirmReject() should not call service when reason is empty', () => {
      component.rejectionReason.setValue('');
      component.confirmReject();
      expect(leaveSpy.rejectLeave).not.toHaveBeenCalled();
    });

    it('confirmReject() should call rejectLeave (non-PM) with the reason', () => {
      component.rejectionReason.setValue('Not enough balance');
      component.confirmReject();
      expect(leaveSpy.rejectLeave).toHaveBeenCalledWith(1, 'Not enough balance');
    });

    it('confirmReject() should call rejectTeamLeave when isPM=true', () => {
      setup(makeDialogData({ isPM: true }));
      component.rejectionReason.setValue('Denied');
      component.confirmReject();
      expect(leaveSpy.rejectTeamLeave).toHaveBeenCalledWith(1, 'Denied');
      expect(leaveSpy.rejectLeave).not.toHaveBeenCalled();
    });

    it('should close dialog with action="rejected" on success', () => {
      component.rejectionReason.setValue('Policy violation');
      component.confirmReject();
      expect(dialogSpy.close).toHaveBeenCalledWith(
        jasmine.objectContaining({ action: 'rejected' })
      );
    });

    it('should set error and clear saving on rejection failure', () => {
      leaveSpy.rejectLeave.and.returnValue(
        throwError(() => ({ error: { message: 'Reject failed' } }))
      );
      component.rejectionReason.setValue('reason here');
      component.confirmReject();
      expect(component.error).toBe('Reject failed');
      expect(component.saving).toBeFalse();
    });

    it('should use fallback error message on rejection failure', () => {
      leaveSpy.rejectLeave.and.returnValue(throwError(() => ({})));
      component.rejectionReason.setValue('reason here');
      component.confirmReject();
      expect(component.error).toBe('Rejection failed. Please try again.');
    });
  });

  // ── cancel / downloadLetter ───────────────────────────────────────────────

  describe('cancel', () => {
    beforeEach(() => setup());

    it('should close the dialog with null', () => {
      component.cancel();
      expect(dialogSpy.close).toHaveBeenCalledWith(null);
    });
  });

  describe('downloadLetter', () => {
    beforeEach(() => setup());

    it('should call openDocument with the leave id', () => {
      component.downloadLetter();
      expect(leaveSpy.openDocument).toHaveBeenCalledWith(1);
    });
  });

  // ── Template helpers ──────────────────────────────────────────────────────

  describe('typeLabel', () => {
    beforeEach(() => setup());

    it('should return the label from LEAVE_TYPE_OPTIONS', () => {
      const expected = LEAVE_TYPE_OPTIONS.find(o => o.type === LeaveType.ANNUAL)?.label;
      expect(component.typeLabel(LeaveType.ANNUAL)).toBe(expected!);
    });

    it('should return the raw string for unknown types', () => {
      expect(component.typeLabel('UNKNOWN_TYPE' as any)).toBe('UNKNOWN_TYPE');
    });
  });

  describe('statusClass', () => {
    beforeEach(() => setup());

    it('should return the color from LEAVE_STATUS_CONFIG', () => {
      const expected = LEAVE_STATUS_CONFIG[LeaveStatus.APPROVED]?.color;
      expect(component.statusClass(LeaveStatus.APPROVED)).toBe(expected);
    });

    it('should return "gray" for unknown status', () => {
      expect(component.statusClass('UNKNOWN' as any)).toBe('gray');
    });
  });

  describe('statusLabel', () => {
    beforeEach(() => setup());

    it('should return the label from LEAVE_STATUS_CONFIG', () => {
      const expected = LEAVE_STATUS_CONFIG[LeaveStatus.REJECTED]?.label;
      expect(component.statusLabel(LeaveStatus.REJECTED)).toBe(expected);
    });

    it('should return the raw string for unknown status', () => {
      expect(component.statusLabel('MYSTERY' as any)).toBe('MYSTERY');
    });
  });

  describe('isPending', () => {
    beforeEach(() => setup());

    it('should return true for all pending variants', () => {
      const pending = [
        LeaveStatus.PENDING,
        LeaveStatus.PENDING_TEAM_LEAD,
        LeaveStatus.PENDING_HR,
        LeaveStatus.PENDING_GM,
      ];
      pending.forEach(s => expect(component.isPending(s)).toBeTrue());
    });

    it('should return false for APPROVED and REJECTED', () => {
      expect(component.isPending(LeaveStatus.APPROVED)).toBeFalse();
      expect(component.isPending(LeaveStatus.REJECTED)).toBeFalse();
    });
  });

  // ── Teardown ──────────────────────────────────────────────────────────────

  describe('ngOnDestroy', () => {
    beforeEach(() => setup());

    it('should complete destroy$ to unsubscribe all streams', () => {
      const destroy$ = (component as any).destroy$ as Subject<void>;
      spyOn(destroy$, 'next').and.callThrough();
      spyOn(destroy$, 'complete').and.callThrough();
      component.ngOnDestroy();
      expect(destroy$.next).toHaveBeenCalled();
      expect(destroy$.complete).toHaveBeenCalled();
    });
  });
});