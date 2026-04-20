import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { ChangePasswordComponent } from './change-password.component';

describe('ChangePasswordComponent', () => {
  let component: ChangePasswordComponent;
  let fixture: ComponentFixture<ChangePasswordComponent>;
  let httpMock: HttpTestingController;

  const mockSnackBar = { open: jasmine.createSpy('open') };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ChangePasswordComponent],
      imports: [ReactiveFormsModule, HttpClientTestingModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [{ provide: MatSnackBar, useValue: mockSnackBar }],
    }).compileComponents();

    fixture = TestBed.createComponent(ChangePasswordComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should build form with correct controls', () => {
    expect(component.passwordForm.contains('currentPassword')).toBeTrue();
    expect(component.passwordForm.contains('newPassword')).toBeTrue();
    expect(component.passwordForm.contains('confirmPassword')).toBeTrue();
  });

  it('should be invalid when empty', () => {
    expect(component.passwordForm.invalid).toBeTrue();
  });

  it('should detect password mismatch', () => {
    component.passwordForm.get('currentPassword')?.setValue('OldPass@1');
    component.passwordForm.get('newPassword')?.setValue('NewPass@1');
    component.passwordForm.get('confirmPassword')?.setValue('DifferentPass@1');
    expect(component.passwordForm.hasError('passwordMismatch')).toBeTrue();
  });

  it('should return correct strength value', () => {
    component.passwordForm.get('newPassword')?.setValue('');
    expect(component.getStrengthValue()).toBe(0);

    component.passwordForm.get('newPassword')?.setValue('Abcdef1@');
    expect(component.getStrengthValue()).toBe(100);
  });

  it('should return correct strength label', () => {
    component.passwordForm.get('newPassword')?.setValue('abc');
    expect(component.getStrengthLabel()).toBe('Weak');

    component.passwordForm.get('newPassword')?.setValue('Abcdef1@');
    expect(component.getStrengthLabel()).toBe('Strong');
  });

  it('should not submit if form is invalid', () => {
    component.onSubmit();
    httpMock.expectNone('/api/auth/change-password');
    expect(component.isLoading).toBeFalse(); // 👈 ajouter
  });

  it('should call API and reset form on success', () => {
    component.passwordForm.setValue({
      currentPassword: 'OldPass@1',
      newPassword: 'NewPass@1',
      confirmPassword: 'NewPass@1',
    });

    component.onSubmit();

    const req = httpMock.expectOne('/api/auth/change-password');
    expect(req.request.method).toBe('POST');
    req.flush({});

    expect(mockSnackBar.open).toHaveBeenCalled();
    expect(component.isLoading).toBeFalse();
  });

  it('should show error message on API failure', () => {
    component.passwordForm.setValue({
      currentPassword: 'OldPass@1',
      newPassword: 'NewPass@1',
      confirmPassword: 'NewPass@1',
    });

    component.onSubmit();

    const req = httpMock.expectOne('/api/auth/change-password');
    req.flush({ message: 'Wrong password' }, { status: 400, statusText: 'Bad Request' });

    expect(component.errorMessage).toBe('Wrong password');
    expect(component.isLoading).toBeFalse();
  });
});
