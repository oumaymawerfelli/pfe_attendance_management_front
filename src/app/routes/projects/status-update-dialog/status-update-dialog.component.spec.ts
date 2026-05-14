import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { StatusUpdateDialogComponent, StatusUpdateDialogData } from './status-update-dialog.component';

describe('StatusUpdateDialogComponent', () => {
  let component: StatusUpdateDialogComponent;
  let fixture: ComponentFixture<StatusUpdateDialogComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<StatusUpdateDialogComponent>>;

  const baseData: StatusUpdateDialogData = {
    projectName:    'Test Project',
    currentStatus:  'IN_PROGRESS',
    newStatus:      'ON_HOLD',
    newStatusLabel: 'On Hold',
    requiresReason: false,
  };

  function setup(data: StatusUpdateDialogData) {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      declarations: [StatusUpdateDialogComponent],
      imports: [ReactiveFormsModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef,    useValue: dialogRefSpy },
      ],
    });

    fixture   = TestBed.createComponent(StatusUpdateDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  // ── Without required reason ───────────────────────────────────────────────

  describe('when reason is not required', () => {
    beforeEach(() => setup({ ...baseData, requiresReason: false }));

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should expose the injected data', () => {
      expect(component.data.projectName).toBe('Test Project');
      expect(component.data.requiresReason).toBeFalse();
    });

    it('should initialise the form with an empty reason', () => {
      expect(component.form.get('reason')?.value).toBe('');
    });

    it('should be valid when reason is empty (not required)', () => {
      expect(component.form.valid).toBeTrue();
    });

    it('should be invalid when reason exceeds 500 characters', () => {
      component.form.get('reason')?.setValue('a'.repeat(501));
      expect(component.form.invalid).toBeTrue();
    });

    it('should be valid when reason is within 500 characters', () => {
      component.form.get('reason')?.setValue('a'.repeat(500));
      expect(component.form.valid).toBeTrue();
    });

    it('cancel() should close dialog with null', () => {
      component.cancel();
      expect(dialogRefSpy.close).toHaveBeenCalledWith(null);
    });

    it('confirm() should close dialog with the reason value', () => {
      component.form.get('reason')?.setValue('optional note');
      component.confirm();
      expect(dialogRefSpy.close).toHaveBeenCalledWith('optional note');
    });

    it('confirm() should close dialog with empty string when reason is blank', () => {
      component.form.get('reason')?.setValue('');
      component.confirm();
      expect(dialogRefSpy.close).toHaveBeenCalledWith('');
    });
  });

  // ── With required reason ──────────────────────────────────────────────────

  describe('when reason is required', () => {
    beforeEach(() => setup({ ...baseData, requiresReason: true }));

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should be invalid when reason is empty', () => {
      component.form.get('reason')?.setValue('');
      expect(component.form.invalid).toBeTrue();
    });

    it('should be valid when reason is provided', () => {
      component.form.get('reason')?.setValue('Project is blocked');
      expect(component.form.valid).toBeTrue();
    });

    it('should be invalid when reason exceeds 500 characters', () => {
      component.form.get('reason')?.setValue('a'.repeat(501));
      expect(component.form.invalid).toBeTrue();
    });

    it('confirm() should close dialog with the provided reason', () => {
      component.form.get('reason')?.setValue('Awaiting budget approval');
      component.confirm();
      expect(dialogRefSpy.close).toHaveBeenCalledWith('Awaiting budget approval');
    });

    it('cancel() should close dialog with null regardless of form state', () => {
      component.form.get('reason')?.setValue('');
      component.cancel();
      expect(dialogRefSpy.close).toHaveBeenCalledWith(null);
    });
  });

  // ── getLabel ──────────────────────────────────────────────────────────────

  describe('getLabel()', () => {
    beforeEach(() => setup(baseData));

    it('should return known status labels', () => {
      expect(component.getLabel('PLANNED')).toBe('Planned');
      expect(component.getLabel('IN_PROGRESS')).toBe('In Progress');
      expect(component.getLabel('ON_HOLD')).toBe('On Hold');
      expect(component.getLabel('COMPLETED')).toBe('Completed');
      expect(component.getLabel('CANCELLED')).toBe('Cancelled');
    });

    it('should return the raw value for unknown statuses', () => {
      expect(component.getLabel('UNKNOWN_STATUS')).toBe('UNKNOWN_STATUS');
    });
  });
});