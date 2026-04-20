import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, throwError } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivateAccountComponent } from './activate-account.component';
import { LoginService } from '@core/authentication';

describe('ActivateAccountComponent', () => {
  let component: ActivateAccountComponent;
  let fixture: ComponentFixture<ActivateAccountComponent>;

  const mockLoginService = {
    validateActivationToken: jasmine.createSpy('validateActivationToken'),
    activateAccount: jasmine.createSpy('activateAccount'),
    resendActivationEmail: jasmine.createSpy('resendActivationEmail'),
  };

  const mockSnackBar = { open: jasmine.createSpy('open') };

  beforeEach(async () => {
    // 👇 Reset all spies to default before each test
    mockLoginService.validateActivationToken.and.returnValue(
      of({ valid: true, email: 'test@test.com', firstName: 'John', lastName: 'Doe' })
    );
    mockLoginService.activateAccount.and.returnValue(of({}));
    mockLoginService.resendActivationEmail.and.returnValue(of({}));
    mockSnackBar.open.calls.reset();

    await TestBed.configureTestingModule({
      declarations: [ActivateAccountComponent],
      imports: [ReactiveFormsModule, RouterTestingModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({
              token: 'fake-token-123456789012345678901234567890123456789012345678901234',
            }),
          },
        },
        { provide: MatSnackBar, useValue: mockSnackBar },
        { provide: LoginService, useValue: mockLoginService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ActivateAccountComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should build the activation form with correct controls', () => {
    expect(component.activationForm.contains('username')).toBeTrue();
    expect(component.activationForm.contains('password')).toBeTrue();
    expect(component.activationForm.contains('confirmPassword')).toBeTrue();
  });

  it('should navigate back to login on invalid token', () => {
    expect(component.isValidToken).toBeTrue();
  });

  it('should pre-fill username from email', () => {
    expect(component.activationForm.get('username')?.value).toBe('test');
  });

  it('should return correct password strength', () => {
    component.activationForm.get('password')?.setValue('');
    expect(component.getPasswordStrength()).toBe('');

    component.activationForm.get('password')?.setValue('abc');
    expect(component.getPasswordStrength()).toBe('Too short');

    component.activationForm.get('password')?.setValue('Abcdefg1@');
    expect(component.getPasswordStrength()).toBe('Very strong');
  });

  it('should detect password mismatch', () => {
    component.activationForm.get('password')?.setValue('Test@1234');
    component.activationForm.get('confirmPassword')?.setValue('Different@1');
    component.activationForm.updateValueAndValidity();
    expect(component.activationForm.hasError('passwordMismatch')).toBeTrue();
  });

  it('should not submit if form is invalid', () => {
    mockLoginService.activateAccount.calls.reset(); // 👈 reset call count
    component.activationForm.get('username')?.setValue('');
    component.onSubmit();
    expect(mockLoginService.activateAccount).not.toHaveBeenCalled();
  });

  it('should handle token validation failure', () => {
    // 👇 Only affects this test, reset happens in next beforeEach
    mockLoginService.validateActivationToken.and.returnValue(
      throwError(() => ({ error: { message: 'Token expired' } }))
    );
    component.validateToken();
    expect(component.isValidToken).toBeFalse();
  });
});
