import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, throwError } from 'rxjs';
import { ActivateAccountComponent } from './activate-account.component';
import { LoginService } from '@core/authentication';

describe('ActivateAccountComponent', () => {
  let component: ActivateAccountComponent;
  let fixture:   ComponentFixture<ActivateAccountComponent>;

  const mockLoginService = {
    validateActivationToken: jasmine.createSpy('validateActivationToken'),
    activateAccount:         jasmine.createSpy('activateAccount'),
    resendActivationEmail:   jasmine.createSpy('resendActivationEmail'),
  };

  const mockSnackBar = { open: jasmine.createSpy('open') };

  beforeEach(async () => {
    mockLoginService.validateActivationToken.and.returnValue(
      of({ valid: true, email: 'test@test.com', firstName: 'John', lastName: 'Doe' })
    );
    mockLoginService.activateAccount.and.returnValue(of({}));
    mockLoginService.resendActivationEmail.and.returnValue(of({}));
    mockSnackBar.open.calls.reset();

    await TestBed.configureTestingModule({
      declarations: [ActivateAccountComponent],
      imports:      [ReactiveFormsModule],   // no RouterTestingModule needed
      schemas:      [NO_ERRORS_SCHEMA],
      providers: [
        {
          provide:  ActivatedRoute,
          useValue: {
            queryParams: of({
              token: 'fake-token-123456789012345678901234567890123456789012345678901234',
            }),
          },
        },
        { provide: MatSnackBar,  useValue: mockSnackBar    },
        { provide: LoginService, useValue: mockLoginService },
        { provide: Router,       useValue: jasmine.createSpyObj('Router', ['navigate']) },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(ActivateAccountComponent);
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

  it('should have a valid token after successful validation', () => {
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
    mockLoginService.activateAccount.calls.reset();
    component.activationForm.get('username')?.setValue('');
    component.onSubmit();
    expect(mockLoginService.activateAccount).not.toHaveBeenCalled();
  });

  it('should handle token validation failure', fakeAsync(() => {
    mockLoginService.validateActivationToken.and.returnValue(
      throwError(() => ({ error: { message: 'Token expired' } }))
    );
    (component as any).tokenValidated = false;
    component.validateToken();
    tick();
    expect(component.isValidToken).toBeFalse();
    tick(5000);   // drain the setTimeout(() => router.navigate(...), 5000)
  }));
});