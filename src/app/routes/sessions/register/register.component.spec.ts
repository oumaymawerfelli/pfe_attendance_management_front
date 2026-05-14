import {
  ComponentFixture, TestBed, fakeAsync, tick,
} from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA }   from '@angular/core';
import { Router }             from '@angular/router';
import { HttpErrorResponse }  from '@angular/common/http';
import { MatSnackBar }        from '@angular/material/snack-bar';
import { of, throwError }     from 'rxjs';

import { RegisterComponent }       from './register.component';
import { LoginService }            from '@core/authentication';
import { RegisterPayload, RegistrationResponse } from '@core/authentication/register-request';
import { TranslateModule }         from '@ngx-translate/core';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fillPersonal(c: RegisterComponent, overrides: Record<string, any> = {}) {
  c.personal.patchValue({
    firstName:     'Alice',
    lastName:      'Smith',
    birthDate:     '1990-01-15',
    gender:        'FEMALE',
    nationalId:    '12345678',
    nationality:   'Tunisian',
    maritalStatus: 'SINGLE',
    ...overrides,
  });
}

function fillProfessional(c: RegisterComponent, overrides: Record<string, any> = {}) {
  c.professional.patchValue({
    email:       'alice@example.com',
    phone:       '22334455',
    department:  'IT',
    hireDate:    '2024-03-01',
    contractType: 'CDI',
    ...overrides,
  });
}

function fillAccount(c: RegisterComponent) {
  c.account.patchValue({ agreeTerms: true });
}

/** Fill every required field so the whole form is valid. */
function fillAll(c: RegisterComponent) {
  fillPersonal(c);
  fillProfessional(c);
  fillAccount(c);
}

const MOCK_RESPONSE: RegistrationResponse = {
  userId:               42,
  email:                'alice@example.com',
  firstName:            'Alice',
  lastName:             'Smith',
  active:               true,
  enabled:              true,
  message:              'User registered successfully',
  activationEmailSent:  true,
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('RegisterComponent', () => {
  let component:      RegisterComponent;
  let fixture:        ComponentFixture<RegisterComponent>;
  let loginSpy:       jasmine.SpyObj<LoginService>;
  let routerSpy:      jasmine.SpyObj<Router>;
  let snackBarSpy:    jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    loginSpy    = jasmine.createSpyObj('LoginService', ['register']);
    routerSpy   = jasmine.createSpyObj('Router',       ['navigate']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar',  ['open']);

    await TestBed.configureTestingModule({
  imports:      [ReactiveFormsModule, TranslateModule.forRoot()],
  declarations: [RegisterComponent],
  schemas:      [NO_ERRORS_SCHEMA],
  providers: [
    { provide: LoginService, useValue: loginSpy   },
    { provide: Router,       useValue: routerSpy  },
    { provide: MatSnackBar,  useValue: snackBarSpy },
  ],
}).compileComponents();

// ← add this
TestBed.overrideTemplate(RegisterComponent, '');

    fixture   = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => { if (fixture) fixture.destroy(); });

  // ── Creation ────────────────────────────────────────────────────────────────

  describe('creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should start with isSubmitting = false', () => {
      expect(component.isSubmitting).toBeFalse();
    });

    it('should expose the correct gender options', () => {
      expect(component.genders).toEqual(['MALE', 'FEMALE']);
    });

    it('should expose the correct maritalStatus options', () => {
      expect(component.maritalStatuses).toEqual(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED']);
    });

    it('should expose the correct contractType options', () => {
      expect(component.contractTypes).toEqual(['CDI', 'CDD', 'INTERNSHIP', 'FREELANCE']);
    });

    it('should expose the correct department options', () => {
      expect(component.departments).toContain('IT');
      expect(component.departments.length).toBeGreaterThan(0);
    });
  });

  // ── Default form values ─────────────────────────────────────────────────────

  describe('form defaults', () => {
    it('personal form should default gender to MALE', () => {
      expect(component.personal.get('gender')!.value).toBe('MALE');
    });

    it('personal form should default maritalStatus to SINGLE', () => {
      expect(component.personal.get('maritalStatus')!.value).toBe('SINGLE');
    });

    it('professional form should default contractType to CDI', () => {
      expect(component.professional.get('contractType')!.value).toBe('CDI');
    });

    it('professional form should default active to true', () => {
      expect(component.professional.get('active')!.value).toBeTrue();
    });

    it('account form should default agreeTerms to false', () => {
      expect(component.account.get('agreeTerms')!.value).toBeFalse();
    });

    it('whole form should be invalid when empty', () => {
      expect(component.registerForm.invalid).toBeTrue();
    });

    it('whole form should be valid when all required fields are filled', () => {
      fillAll(component);
      expect(component.registerForm.valid).toBeTrue();
    });
  });

  // ── Personal sub-form validation ────────────────────────────────────────────

  describe('personal sub-form validation', () => {
    it('firstName should be invalid when empty', () => {
      component.personal.get('firstName')!.setValue('');
      expect(component.personal.get('firstName')!.invalid).toBeTrue();
    });

    it('firstName should be invalid when shorter than 2 chars', () => {
      component.personal.get('firstName')!.setValue('A');
      expect(component.personal.get('firstName')!.invalid).toBeTrue();
    });

    it('nationalId should be invalid when not 8 digits', () => {
      component.personal.get('nationalId')!.setValue('123');
      expect(component.personal.get('nationalId')!.invalid).toBeTrue();
    });

    it('nationalId should be valid when exactly 8 digits', () => {
      component.personal.get('nationalId')!.setValue('12345678');
      expect(component.personal.get('nationalId')!.valid).toBeTrue();
    });
  });

  // ── Professional sub-form validation ────────────────────────────────────────

  describe('professional sub-form validation', () => {
    it('email should be invalid for a bad email', () => {
      component.professional.get('email')!.setValue('not-an-email');
      expect(component.professional.get('email')!.invalid).toBeTrue();
    });

    it('phone should be invalid when not 8 digits', () => {
      component.professional.get('phone')!.setValue('123');
      expect(component.professional.get('phone')!.invalid).toBeTrue();
    });

    it('evaluationScore should be invalid when above 5', () => {
      component.professional.get('evaluationScore')!.setValue(6);
      expect(component.professional.get('evaluationScore')!.invalid).toBeTrue();
    });

    it('housingAllowance should be invalid when negative', () => {
      component.professional.get('housingAllowance')!.setValue(-1);
      expect(component.professional.get('housingAllowance')!.invalid).toBeTrue();
    });

    it('socialSecurityNumber should be invalid when not 10 digits', () => {
      component.professional.get('socialSecurityNumber')!.setValue('123');
      expect(component.professional.get('socialSecurityNumber')!.invalid).toBeTrue();
    });

    it('socialSecurityNumber should be valid when empty (optional)', () => {
      component.professional.get('socialSecurityNumber')!.setValue('');
      expect(component.professional.get('socialSecurityNumber')!.valid).toBeTrue();
    });
  });

  // ── matchValidator ──────────────────────────────────────────────────────────

  describe('matchValidator()', () => {
    it('should return { mismatch: true } when source and target differ', () => {
      const group = component['fb'].group(
        { a: ['hello'], b: ['world'] },
        { validators: component.matchValidator('a', 'b') }
      );
      expect(group.errors).toEqual({ mismatch: true });
    });

    it('should return null when source and target match', () => {
      const group = component['fb'].group(
        { a: ['same'], b: ['same'] },
        { validators: component.matchValidator('a', 'b') }
      );
      expect(group.errors).toBeNull();
    });

    it('should set mismatch error on the target control', () => {
      const group = component['fb'].group(
        { a: ['hello'], b: ['world'] },
        { validators: component.matchValidator('a', 'b') }
      );
      expect(group.get('b')!.errors).toEqual({ mismatch: true });
    });

    it('should clear target errors when values match', () => {
      const group = component['fb'].group(
        { a: ['same'], b: ['same'] },
        { validators: component.matchValidator('a', 'b') }
      );
      expect(group.get('b')!.errors).toBeNull();
    });
  });

  // ── onSubmit() — guard ──────────────────────────────────────────────────────

  describe('onSubmit() — invalid form guard', () => {
    it('should not call register when form is invalid', () => {
      component.onSubmit();
      expect(loginSpy.register).not.toHaveBeenCalled();
    });

    it('should not call register when isSubmitting is true', () => {
      fillAll(component);
      component.isSubmitting = true;
      component.onSubmit();
      expect(loginSpy.register).not.toHaveBeenCalled();
    });

    it('should mark all controls touched when form is invalid', () => {
      component.onSubmit();
      expect(component.personal.get('firstName')!.touched).toBeTrue();
      expect(component.professional.get('email')!.touched).toBeTrue();
      expect(component.account.get('agreeTerms')!.touched).toBeTrue();
    });

    it('should not set isSubmitting when form is invalid', () => {
      component.onSubmit();
      expect(component.isSubmitting).toBeFalse();
    });
  });

  // ── onSubmit() — payload ────────────────────────────────────────────────────

  describe('onSubmit() — payload construction', () => {
    beforeEach(() => {
      loginSpy.register.and.returnValue(of(MOCK_RESPONSE));
      fillAll(component);
    });

    it('should call register with the correct email', () => {
      component.onSubmit();
      const payload: RegisterPayload = loginSpy.register.calls.mostRecent().args[0];
      expect(payload.email).toBe('alice@example.com');
    });

    it('should call register with the correct firstName', () => {
      component.onSubmit();
      const payload: RegisterPayload = loginSpy.register.calls.mostRecent().args[0];
      expect(payload.firstName).toBe('Alice');
    });

    it('should format birthDate as YYYY-MM-DD', () => {
      component.personal.patchValue({ birthDate: '1990-01-15' });
      component.onSubmit();
      const payload: RegisterPayload = loginSpy.register.calls.mostRecent().args[0];
      expect(payload.birthDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should set active to true by default', () => {
      component.onSubmit();
      const payload: RegisterPayload = loginSpy.register.calls.mostRecent().args[0];
      expect(payload.active).toBeTrue();
    });

    it('should omit address when empty', () => {
      component.professional.patchValue({ address: '' });
      component.onSubmit();
      const payload: RegisterPayload = loginSpy.register.calls.mostRecent().args[0];
      expect(payload.address).toBeUndefined();
    });

    it('should include address when provided', () => {
      component.professional.patchValue({ address: '12 Main St' });
      component.onSubmit();
      const payload: RegisterPayload = loginSpy.register.calls.mostRecent().args[0];
      expect(payload.address).toBe('12 Main St');
    });

    it('should set isSubmitting to true before response', () => {
      const subject = new (require('rxjs').Subject)();
      loginSpy.register.and.returnValue(subject.asObservable());
      component.onSubmit();
      expect(component.isSubmitting).toBeTrue();
    });
  });

  // ── onSubmit() — success ────────────────────────────────────────────────────

  describe('onSubmit() — success', () => {
    beforeEach(() => {
      loginSpy.register.and.returnValue(of(MOCK_RESPONSE));
      fillAll(component);
      component.onSubmit();
    });

    it('should navigate to /auth/registration-success', () => {
      expect(routerSpy.navigate).toHaveBeenCalledWith(
        ['/auth/registration-success'],
        jasmine.any(Object)
      );
    });

    it('should pass email in navigation state', () => {
      const navArgs = routerSpy.navigate.calls.mostRecent().args[1] as any;
      expect(navArgs.state.email).toBe('alice@example.com');
    });

    it('should pass message in navigation state', () => {
      const navArgs = routerSpy.navigate.calls.mostRecent().args[1] as any;
      expect(navArgs.state.message).toBe(MOCK_RESPONSE.message);
    });

    it('should pass userId in navigation state', () => {
      const navArgs = routerSpy.navigate.calls.mostRecent().args[1] as any;
      expect(navArgs.state.userId).toBe(MOCK_RESPONSE.userId);
    });

    it('should store email in localStorage', () => {
      expect(localStorage.getItem('registrationEmail')).toBe('alice@example.com');
    });

    it('should reset isSubmitting to false', () => {
      expect(component.isSubmitting).toBeFalse();
    });

    it('should not open snackBar on success', () => {
      expect(snackBarSpy.open).not.toHaveBeenCalled();
    });

    afterEach(() => localStorage.removeItem('registrationEmail'));
  });

  // ── onSubmit() — error ──────────────────────────────────────────────────────

  describe('onSubmit() — error', () => {
    beforeEach(() => fillAll(component));

    it('should show the server error message', () => {
      loginSpy.register.and.returnValue(
        throwError(() => new HttpErrorResponse({ error: { message: 'Email already taken' } }))
      );
      component.onSubmit();
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Email already taken', 'Close', jasmine.objectContaining({ duration: 5000 })
      );
    });

    it('should fall back to err.message when error.message is absent', () => {
      loginSpy.register.and.returnValue(
        throwError(() => new HttpErrorResponse({ error: {}, statusText: 'Bad Request', status: 400 }))
      );
      component.onSubmit();
      const msg: string = snackBarSpy.open.calls.mostRecent().args[0];
      expect(msg).toBeTruthy();
    });

  it('should fall back to err.message when neither error.message nor error is available', () => {
  loginSpy.register.and.returnValue(
    throwError(() => new HttpErrorResponse({}))
  );
  component.onSubmit();
  // err.error is null → err.error?.message is undefined
  // err.message is Angular's generated string → that gets shown
  const shownMessage: string = snackBarSpy.open.calls.mostRecent().args[0];
  expect(shownMessage).toBeTruthy();
  expect(snackBarSpy.open).toHaveBeenCalledWith(
    shownMessage, 'Close', jasmine.objectContaining({ duration: 5000 })
  );
});

    it('should reset isSubmitting to false on error', () => {
      loginSpy.register.and.returnValue(
        throwError(() => new HttpErrorResponse({ error: {} }))
      );
      component.onSubmit();
      expect(component.isSubmitting).toBeFalse();
    });

    it('should not navigate on error', () => {
      loginSpy.register.and.returnValue(
        throwError(() => new HttpErrorResponse({ error: {} }))
      );
      component.onSubmit();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });
  });

  // ── markFormGroupTouched ────────────────────────────────────────────────────

  describe('markFormGroupTouched()', () => {
    it('should mark every leaf control as touched', () => {
      component.markFormGroupTouched(component.registerForm);
      const controls = [
        component.personal.get('firstName')!,
        component.personal.get('nationalId')!,
        component.professional.get('email')!,
        component.professional.get('phone')!,
        component.account.get('agreeTerms')!,
      ];
      controls.forEach(ctrl => expect(ctrl.touched).toBeTrue());
    });
  });
});