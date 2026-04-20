import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { MissedCheckoutDialogComponent } from './missed-checkout-dialog.component';

describe('MissedCheckoutDialogComponent', () => {
  let component: MissedCheckoutDialogComponent;
  let fixture: ComponentFixture<MissedCheckoutDialogComponent>;

  const matDialogRefMock = { close: jasmine.createSpy('close') };

  beforeEach(async () => {
    matDialogRefMock.close.calls.reset();
    await TestBed.configureTestingModule({
      declarations: [MissedCheckoutDialogComponent],
      imports: [ReactiveFormsModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: MatDialogRef, useValue: matDialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: { employeeName: 'John' } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MissedCheckoutDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with invalid form', () => {
    expect(component.checkOutTime.valid).toBeFalse();
  });

  it('should not close dialog if form is invalid', () => {
    component.confirm();
    expect(matDialogRefMock.close).not.toHaveBeenCalled();
  });

  it('should close dialog with null on skip', () => {
    component.skip();
    expect(matDialogRefMock.close).toHaveBeenCalledWith(null);
  });

  it('should close dialog with time value on valid confirm', done => {
    component.checkOutTime.setValue('17:30');
    component.confirm();
    expect(component.saving).toBeTrue();

    setTimeout(() => {
      expect(matDialogRefMock.close).toHaveBeenCalledWith('17:30');
      done();
    }, 1100);
  });
});
