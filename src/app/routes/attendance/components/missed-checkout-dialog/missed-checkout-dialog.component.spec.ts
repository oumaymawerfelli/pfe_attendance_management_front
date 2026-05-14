import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
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

    fixture   = TestBed.createComponent(MissedCheckoutDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialise with an invalid form', () => {
    expect(component.checkOutTime.valid).toBeFalse();
  });

  it('should expose injected dialog data', () => {
    expect(component.data.employeeName).toBe('John');
  });

  it('should not close dialog when form is invalid', () => {
    component.confirm();
    expect(matDialogRefMock.close).not.toHaveBeenCalled();
  });

  it('should not set saving=true when form is invalid', () => {
    component.confirm();
    expect(component.saving).toBeFalse();
  });

  it('should close dialog with null on skip()', () => {
    component.skip();
    expect(matDialogRefMock.close).toHaveBeenCalledWith(null);
  });

  it('should set saving=true immediately on valid confirm()', fakeAsync(() => {
    component.checkOutTime.setValue('17:30');
    component.confirm();
    expect(component.saving).toBeTrue();
    tick(1000); // drain the setTimeout
  }));

  it('should close dialog with the time value after confirm()', fakeAsync(() => {
    component.checkOutTime.setValue('17:30');
    component.confirm();
    tick(1000);
    expect(matDialogRefMock.close).toHaveBeenCalledWith('17:30');
  }));

  it('should reset saving=false after confirm() completes', fakeAsync(() => {
    component.checkOutTime.setValue('17:30');
    component.confirm();
    tick(1000);
    expect(component.saving).toBeFalse();
  }));

  it('should clear error on confirm()', fakeAsync(() => {
    component.error = 'previous error';
    component.checkOutTime.setValue('09:00');
    component.confirm();
    expect(component.error).toBe('');
    tick(1000);
  }));
});