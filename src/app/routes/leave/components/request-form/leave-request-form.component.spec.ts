import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, throwError } from 'rxjs';

import { LeaveRequestFormComponent } from './leave-request-form.component';
import { LeaveService } from '../../services/leave.service';
import { LeaveType } from '../../models/leave.model';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';


// ── Mock data ─────────────────────────────────────────────────────────────────

const mockSummary = {
  annualTotal:     20,
  annualTaken:     5,
  annualRemaining: 15,
  sickTotal:       10,
  sickTaken:       2,
  sickRemaining:   8,
};

describe('LeaveRequestFormComponent', () => {
  let component: LeaveRequestFormComponent;
  let fixture:   ComponentFixture<LeaveRequestFormComponent>;
  let leaveSpy:  jasmine.SpyObj<LeaveService>;

  beforeEach(async () => {
    leaveSpy = jasmine.createSpyObj('LeaveService', [
      'getSummary', 'requestLeave', 'saveDraft',
      'toLocalISODate', 'calculateWorkingDays',
    ]);
    leaveSpy.getSummary.and.returnValue(of(mockSummary as any));
    leaveSpy.requestLeave.and.returnValue(of(null as any));
    leaveSpy.saveDraft.and.returnValue(of(null as any));
    leaveSpy.toLocalISODate.and.callFake(
      (d: Date) => d.toISOString().split('T')[0]
    );
    leaveSpy.calculateWorkingDays.and.returnValue(5);

    await TestBed.configureTestingModule({
      declarations: [LeaveRequestFormComponent],
      imports:      [ReactiveFormsModule, MatSlideToggleModule, NoopAnimationsModule],
      schemas:      [NO_ERRORS_SCHEMA],
      providers:    [{ provide: LeaveService, useValue: leaveSpy }],
    }).compileComponents();

    fixture   = TestBed.createComponent(LeaveRequestFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  // ── Creation & init ───────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should build the form on init', () => {
    expect(component.form).toBeDefined();
    expect(component.form.get('leaveType')).toBeTruthy();
    expect(component.form.get('startDate')).toBeTruthy();
    expect(component.form.get('endDate')).toBeTruthy();
    expect(component.form.get('halfDay')).toBeTruthy();
    expect(component.form.get('reason')).toBeTruthy();
  });

  it('should initialise form with ANNUAL leaveType and halfDay=false', () => {
    expect(component.form.get('leaveType')?.value).toBe(LeaveType.ANNUAL);
    expect(component.form.get('halfDay')?.value).toBeFalse();
  });

  it('should call getSummary on init', () => {
    expect(leaveSpy.getSummary).toHaveBeenCalled();
  });

  it('should populate summary after load', () => {
    expect(component.summary).toEqual(mockSummary as any);
    expect(component.loading).toBeFalse();
  });

  it('should set loading=false on summary error', () => {
    leaveSpy.getSummary.and.returnValue(throwError(() => new Error('fail')));
    component.loadSummary();
    expect(component.loading).toBeFalse();
  });

  // ── Form validation ───────────────────────────────────────────────────────

  it('should be invalid when required fields are empty', () => {
    component.form.patchValue({ startDate: null, endDate: null, reason: '' });
    expect(component.form.invalid).toBeTrue();
  });

  it('should be invalid when reason is shorter than 10 characters', () => {
    component.form.get('reason')?.setValue('short');
    expect(component.form.get('reason')?.invalid).toBeTrue();
  });

  it('should be invalid when reason exceeds 200 characters', () => {
    component.form.get('reason')?.setValue('a'.repeat(201));
    expect(component.form.get('reason')?.invalid).toBeTrue();
  });

  it('should be valid with all required fields filled', () => {
    component.form.patchValue({
      leaveType: LeaveType.ANNUAL,
      startDate: new Date('2026-06-01'),
      endDate:   new Date('2026-06-05'),
      reason:    'Taking a well-deserved vacation',
    });
    expect(component.form.valid).toBeTrue();
  });

  // ── selectLeaveType ───────────────────────────────────────────────────────

  it('should update leaveType when selectLeaveType is called', () => {
    component.selectLeaveType(LeaveType.SICK);
    expect(component.form.get('leaveType')?.value).toBe(LeaveType.SICK);
  });

  // ── remainingFor ──────────────────────────────────────────────────────────

  it('should return "—" when summary is null', () => {
    component.summary = null;
    expect(component.remainingFor(LeaveType.ANNUAL)).toBe('—');
  });

  it('should return annualRemaining for ANNUAL', () => {
    expect(component.remainingFor(LeaveType.ANNUAL)).toBe(mockSummary.annualRemaining);
  });

  it('should return sickRemaining for SICK', () => {
    expect(component.remainingFor(LeaveType.SICK)).toBe(mockSummary.sickRemaining);
  });

  it('should return "∞" for UNPAID', () => {
    expect(component.remainingFor(LeaveType.UNPAID)).toBe('∞');
  });

  // ── selectedRemaining / usedThisYear / totalForType ──────────────────────

  it('selectedRemaining should return annualRemaining for ANNUAL', () => {
    component.form.patchValue({ leaveType: LeaveType.ANNUAL });
    expect(component.selectedRemaining).toBe(mockSummary.annualRemaining);
  });

  it('selectedRemaining should return sickRemaining for SICK', () => {
    component.form.patchValue({ leaveType: LeaveType.SICK });
    expect(component.selectedRemaining).toBe(mockSummary.sickRemaining);
  });

  it('selectedRemaining should return null for UNPAID', () => {
    component.form.patchValue({ leaveType: LeaveType.UNPAID });
    expect(component.selectedRemaining).toBeNull();
  });

  it('usedThisYear should return annualTaken for ANNUAL', () => {
    component.form.patchValue({ leaveType: LeaveType.ANNUAL });
    expect(component.usedThisYear).toBe(mockSummary.annualTaken);
  });

  it('usedThisYear should return 0 when summary is null', () => {
    component.summary = null;
    expect(component.usedThisYear).toBe(0);
  });

  it('totalForType should return annualTotal for ANNUAL', () => {
    component.form.patchValue({ leaveType: LeaveType.ANNUAL });
    expect(component.totalForType).toBe(mockSummary.annualTotal);
  });

  // ── remainingAfter ────────────────────────────────────────────────────────

  it('should return null for UNPAID (unlimited)', () => {
    component.form.patchValue({ leaveType: LeaveType.UNPAID });
    expect(component.remainingAfter).toBeNull();
  });

  it('should subtract workingDays from selectedRemaining', () => {
    component.form.patchValue({ leaveType: LeaveType.ANNUAL });
    component.workingDays = 5;
    expect(component.remainingAfter).toBe(mockSummary.annualRemaining - 5); // 10
  });

  it('should floor remainingAfter at 0', () => {
    component.form.patchValue({ leaveType: LeaveType.ANNUAL });
    component.workingDays = 100;
    expect(component.remainingAfter).toBe(0);
  });

  // ── onDateChange ──────────────────────────────────────────────────────────

  it('should reset workingDays and previewDays when dates are missing', () => {
    component.form.patchValue({ startDate: null, endDate: null });
    component.onDateChange();
    expect(component.workingDays).toBe(0);
    expect(component.previewDays).toEqual([]);
  });

  it('should call calculateWorkingDays and buildPreview when both dates set', () => {
    const start = new Date('2026-06-02');
    const end   = new Date('2026-06-06');
    component.form.patchValue({ startDate: start, endDate: end, halfDay: false });
    component.onDateChange();
    expect(leaveSpy.calculateWorkingDays).toHaveBeenCalled();
    expect(component.workingDays).toBe(5);
    expect(component.previewDays.length).toBeGreaterThan(0);
  });

  it('should mark weekends in previewDays', () => {
    // 2026-06-06 is a Saturday
    const start = new Date('2026-06-06');
    const end   = new Date('2026-06-07');
    component.form.patchValue({ startDate: start, endDate: end });
    component.onDateChange();
    const sat = component.previewDays.find(d => d.dayName === 'Sat');
    expect(sat?.isWeekend).toBeTrue();
  });

  it('should cap previewDays at 7', () => {
    const start = new Date('2026-06-01');
    const end   = new Date('2026-06-30');
    component.form.patchValue({ startDate: start, endDate: end });
    component.onDateChange();
    expect(component.previewDays.length).toBeLessThanOrEqual(7);
  });

  // ── minEndDate ────────────────────────────────────────────────────────────

  it('should return startDate when set', () => {
    const d = new Date('2026-06-10');
    component.form.get('startDate')?.setValue(d);
    expect(component.minEndDate).toEqual(d);
  });

  it('should fall back to today when startDate is null', () => {
    component.form.get('startDate')?.setValue(null);
    expect(component.minEndDate).toEqual(component.today);
  });

  // ── Attachment ────────────────────────────────────────────────────────────

  it('onDragOver should set isDragging=true', () => {
    const event = { preventDefault: jasmine.createSpy() } as any;
    component.onDragOver(event);
    expect(component.isDragging).toBeTrue();
  });

  it('onDragLeave should set isDragging=false', () => {
    component.isDragging = true;
    component.onDragLeave();
    expect(component.isDragging).toBeFalse();
  });

  it('onDrop should set selectedFile and clear isDragging', () => {
    const file  = new File(['content'], 'doc.pdf');
    const event = {
      preventDefault: jasmine.createSpy(),
      dataTransfer:   { files: [file] },
    } as any;
    component.onDrop(event);
    expect(component.isDragging).toBeFalse();
    expect(component.selectedFile).toBe(file);
  });

  it('removeFile should clear selectedFile', () => {
    component.selectedFile = new File(['x'], 'test.pdf');
    component.removeFile();
    expect(component.selectedFile).toBeNull();
  });

  it('fileSizeMB should return empty string when no file', () => {
    component.selectedFile = null;
    expect(component.fileSizeMB).toBe('');
  });

  it('fileSizeMB should return size in MB', () => {
    const bytes = 2 * 1_048_576; // 2 MB
    Object.defineProperty(component, 'selectedFile', {
      value: { size: bytes, name: 'big.pdf' }, writable: true,
    });
    expect(component.fileSizeMB).toBe('2.00');
  });

  // ── reasonLength ─────────────────────────────────────────────────────────

  it('reasonLength should reflect current reason length', () => {
    component.form.get('reason')?.setValue('Hello world');
    expect(component.reasonLength).toBe(11);
  });

  it('reasonLength should be 0 when reason is empty', () => {
    component.form.get('reason')?.setValue('');
    expect(component.reasonLength).toBe(0);
  });

  // ── selectedLeaveLabel ────────────────────────────────────────────────────

  it('should return label for selected leave type', () => {
    component.form.patchValue({ leaveType: LeaveType.ANNUAL });
    expect(typeof component.selectedLeaveLabel).toBe('string');
    expect(component.selectedLeaveLabel.length).toBeGreaterThan(0);
  });

  // ── saveDraft ─────────────────────────────────────────────────────────────

  it('should call saveDraft and emit drafted on success', () => {
    const draftedSpy = spyOn(component.drafted, 'emit');
    component.form.patchValue({
      leaveType: LeaveType.ANNUAL,
      startDate: new Date('2026-06-01'),
      endDate:   new Date('2026-06-05'),
      reason:    'Draft reason here',
    });
    component.saveDraft();
    expect(leaveSpy.saveDraft).toHaveBeenCalled();
    expect(draftedSpy).toHaveBeenCalled();
    expect(component.saving).toBeFalse();
  });

  it('should set error message when saveDraft fails', () => {
    leaveSpy.saveDraft.and.returnValue(
      throwError(() => ({ error: { message: 'Draft failed' } }))
    );
    component.saveDraft();
    expect(component.error).toBe('Draft failed');
    expect(component.saving).toBeFalse();
  });

  it('should not call saveDraft when already saving', () => {
    component.saving = true;
    leaveSpy.saveDraft.calls.reset();
    component.saveDraft();
    expect(leaveSpy.saveDraft).not.toHaveBeenCalled();
  });

  // ── submit ────────────────────────────────────────────────────────────────

  it('should not submit when form is invalid', () => {
    component.form.patchValue({ startDate: null, endDate: null, reason: '' });
    component.submit();
    expect(leaveSpy.requestLeave).not.toHaveBeenCalled();
  });

  it('should not submit when workingDays is 0', () => {
    component.form.patchValue({
      leaveType: LeaveType.ANNUAL,
      startDate: new Date('2026-06-01'),
      endDate:   new Date('2026-06-05'),
      reason:    'Need a break from work',
    });
    component.workingDays = 0;
    component.submit();
    expect(leaveSpy.requestLeave).not.toHaveBeenCalled();
  });

  it('should call requestLeave and emit submitted on success', () => {
    const submittedSpy = spyOn(component.submitted, 'emit');
    component.form.patchValue({
      leaveType: LeaveType.ANNUAL,
      startDate: new Date('2026-06-01'),
      endDate:   new Date('2026-06-05'),
      reason:    'Need a break from work',
    });
    component.workingDays = 5;
    component.submit();
    expect(leaveSpy.requestLeave).toHaveBeenCalled();
    expect(submittedSpy).toHaveBeenCalled();
    expect(component.success).toBeTrue();
    expect(component.submitting).toBeFalse();
  });

  it('should reset form state after successful submit', () => {
    component.form.patchValue({
      leaveType: LeaveType.ANNUAL,
      startDate: new Date('2026-06-01'),
      endDate:   new Date('2026-06-05'),
      reason:    'Need a break from work',
    });
    component.workingDays  = 5;
    component.selectedFile = new File(['x'], 'doc.pdf');
    component.submit();
    expect(component.selectedFile).toBeNull();
    expect(component.workingDays).toBe(0);
    expect(component.previewDays).toEqual([]);
  });

  it('should set error message when submit fails', () => {
    leaveSpy.requestLeave.and.returnValue(
      throwError(() => ({ error: { message: 'Server error' } }))
    );
    component.form.patchValue({
      leaveType: LeaveType.ANNUAL,
      startDate: new Date('2026-06-01'),
      endDate:   new Date('2026-06-05'),
      reason:    'Need a break from work',
    });
    component.workingDays = 5;
    component.submit();
    expect(component.error).toBe('Server error');
    expect(component.submitting).toBeFalse();
  });

  it('should not submit when already submitting', () => {
    component.submitting = true;
    leaveSpy.requestLeave.calls.reset();
    component.submit();
    expect(leaveSpy.requestLeave).not.toHaveBeenCalled();
  });
});