import {
  ComponentFixture, TestBed,
  fakeAsync, tick,
} from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA }   from '@angular/core';
import { Router }             from '@angular/router';
import { HttpErrorResponse }  from '@angular/common/http';
import { MatSnackBar }        from '@angular/material/snack-bar';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Subject, of, throwError } from 'rxjs';

import { LoginComponent }               from './login.component';
import { AuthService }                  from '@core/authentication';
import { AttendanceService }            from '../../attendance/services/attendance.service';
import { OvertimeCheckService }         from '../../attendance/services/overtime-check.service';
import { MissedCheckoutDialogComponent } from '../../attendance/components/missed-checkout-dialog/missed-checkout-dialog.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
// ── Suite ─────────────────────────────────────────────────────────────────────

describe('LoginComponent', () => {
  let component:          LoginComponent;
  let fixture:            ComponentFixture<LoginComponent>;
  let authSpy:            jasmine.SpyObj<AuthService>;
  let routerSpy:          jasmine.SpyObj<Router>;
  let snackBarSpy:        jasmine.SpyObj<MatSnackBar>;
  let dialogSpy:          jasmine.SpyObj<MatDialog>;
  let attendanceSpy:      jasmine.SpyObj<AttendanceService>;
  let overtimeCheckSpy:   jasmine.SpyObj<OvertimeCheckService>;

  // Helpers
  function fillForm(username = 'alice@example.com', password = 'Secret1!') {
    component.loginForm.setValue({ username, password, rememberMe: false });
  }

  function triggerSuccessfulLogin(hasMissed = false) {
    authSpy.login.and.returnValue(of(true));
    attendanceSpy.checkIn.and.returnValue(of(null as any));
    attendanceSpy.hasMissedCheckout.and.returnValue(of(hasMissed));
  }

  beforeEach(async () => {
    authSpy          = jasmine.createSpyObj('AuthService',        ['login']);
    routerSpy        = jasmine.createSpyObj('Router',             ['navigateByUrl']);
    snackBarSpy      = jasmine.createSpyObj('MatSnackBar',        ['open']);
    dialogSpy        = jasmine.createSpyObj('MatDialog',          ['open']);
    attendanceSpy    = jasmine.createSpyObj('AttendanceService',  ['checkIn', 'hasMissedCheckout']);
    overtimeCheckSpy = jasmine.createSpyObj('OvertimeCheckService', ['startChecking']);

    await TestBed.configureTestingModule({
      imports:      [ReactiveFormsModule, TranslateModule.forRoot(),MatCheckboxModule,],
      declarations: [LoginComponent],
      schemas:      [NO_ERRORS_SCHEMA],
      providers: [
        { provide: AuthService,        useValue: authSpy          },
        { provide: Router,             useValue: routerSpy        },
        { provide: MatSnackBar,        useValue: snackBarSpy      },
        { provide: MatDialog,          useValue: dialogSpy        },
        { provide: AttendanceService,  useValue: attendanceSpy    },
        { provide: OvertimeCheckService, useValue: overtimeCheckSpy },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

afterEach(() => {
  if (fixture) fixture.destroy();
});

  // ── Creation ──────────────────────────────────────────────────────────────

  describe('creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should start with isSubmitting = false', () => {
      expect(component.isSubmitting).toBeFalse();
    });

    it('should start with hidePassword = true', () => {
      expect(component.hidePassword).toBeTrue();
    });

    it('should initialise tickArray with 60 entries (0–59)', () => {
      expect(component.tickArray.length).toBe(60);
      expect(component.tickArray[0]).toBe(0);
      expect(component.tickArray[59]).toBe(59);
    });
  });

  // ── Form getters ──────────────────────────────────────────────────────────

  describe('form getters', () => {
    it('username getter should return the username control', () => {
      expect(component.username).toBe(component.loginForm.get('username')!);
    });

    it('password getter should return the password control', () => {
      expect(component.password).toBe(component.loginForm.get('password')!);
    });

    it('rememberMe getter should return the rememberMe control', () => {
      expect(component.rememberMe).toBe(component.loginForm.get('rememberMe')!);
    });

    it('form should be invalid when empty', () => {
      expect(component.loginForm.invalid).toBeTrue();
    });

    it('form should be valid when username and password are filled', () => {
      fillForm();
      expect(component.loginForm.valid).toBeTrue();
    });
  });

  // ── login() — invalid form guard ─────────────────────────────────────────

  describe('login() — invalid form', () => {
    it('should not call auth.login when form is invalid', () => {
      component.login();
      expect(authSpy.login).not.toHaveBeenCalled();
    });

    it('should mark all controls as touched when form is invalid', () => {
      component.login();
      expect(component.username.touched).toBeTrue();
      expect(component.password.touched).toBeTrue();
    });

    it('should not set isSubmitting when form is invalid', () => {
      component.login();
      expect(component.isSubmitting).toBeFalse();
    });
  });

  // ── login() — auth.login call ─────────────────────────────────────────────

  describe('login() — auth.login()', () => {
    it('should call auth.login with trimmed credentials and rememberMe', () => {
      triggerSuccessfulLogin();
      component.loginForm.setValue({
        username:   '  alice@example.com  ',
        password:   '  Secret1!  ',
        rememberMe: true,
      });
      component.login();
      expect(authSpy.login).toHaveBeenCalledWith(
        'alice@example.com', 'Secret1!', true
      );
    });

    it('should set isSubmitting to true before the response', () => {
      authSpy.login.and.returnValue(new Subject<any>().asObservable());
      fillForm();
      component.login();
      expect(component.isSubmitting).toBeTrue();
    });

    it('should not proceed when auth returns false', () => {
      authSpy.login.and.returnValue(of(false));
      fillForm();
      component.login();
      expect(attendanceSpy.checkIn).not.toHaveBeenCalled();
    });
  });

  // ── login() — happy path, no missed checkout ──────────────────────────────

  describe('login() — success, no missed checkout', () => {
    beforeEach(() => {
      triggerSuccessfulLogin(false);
      fillForm();
      component.login();
    });

    it('should call checkIn', () => {
      expect(attendanceSpy.checkIn).toHaveBeenCalled();
    });

    it('should call hasMissedCheckout', () => {
      expect(attendanceSpy.hasMissedCheckout).toHaveBeenCalled();
    });

    it('should show a success snackbar', () => {
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Login successful!', 'Close', jasmine.objectContaining({ duration: 3000 })
      );
    });

    it('should start overtime checking', () => {
      expect(overtimeCheckSpy.startChecking).toHaveBeenCalled();
    });

    it('should navigate to /dashboard', () => {
      expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/dashboard');
    });

    it('should not open the missed-checkout dialog', () => {
      expect(dialogSpy.open).not.toHaveBeenCalled();
    });

    it('should reset isSubmitting to false', () => {
      expect(component.isSubmitting).toBeFalse();
    });
  });

  // ── login() — happy path, missed checkout ────────────────────────────────

  describe('login() — success, missed checkout', () => {
    let afterClosed$:  Subject<void>;
    let dialogRefSpy:  jasmine.SpyObj<MatDialogRef<MissedCheckoutDialogComponent>>;

    beforeEach(() => {
      afterClosed$ = new Subject<void>();
      dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRefSpy.afterClosed.and.returnValue(afterClosed$.asObservable());
      dialogSpy.open.and.returnValue(dialogRefSpy as any);

      triggerSuccessfulLogin(true);
      fillForm();
      component.login();
    });

    it('should open MissedCheckoutDialogComponent', () => {
      expect(dialogSpy.open).toHaveBeenCalledWith(
        MissedCheckoutDialogComponent,
        jasmine.objectContaining({ disableClose: true })
      );
    });

    it('should open dialog with width 400px', () => {
      expect(dialogSpy.open).toHaveBeenCalledWith(
        MissedCheckoutDialogComponent,
        jasmine.objectContaining({ width: '400px' })
      );
    });

    it('should navigate to /dashboard only after dialog closes', fakeAsync(() => {
      expect(routerSpy.navigateByUrl).not.toHaveBeenCalled();
      afterClosed$.next();
      tick();
      expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/dashboard');
    }));
  });

  // ── login() — checkIn error is silenced ──────────────────────────────────

  describe('login() — checkIn error', () => {
    it('should continue the flow when checkIn errors', () => {
      authSpy.login.and.returnValue(of(true));
      attendanceSpy.checkIn.and.returnValue(throwError(() => new Error('network')));
      attendanceSpy.hasMissedCheckout.and.returnValue(of(false));
      fillForm();
      component.login();
      expect(attendanceSpy.hasMissedCheckout).toHaveBeenCalled();
      expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/dashboard');
    });
  });

  // ── login() — hasMissedCheckout error is silenced ────────────────────────

  describe('login() — hasMissedCheckout error', () => {
    it('should treat a hasMissedCheckout error as false and navigate', () => {
      authSpy.login.and.returnValue(of(true));
      attendanceSpy.checkIn.and.returnValue(of(null as any));
      attendanceSpy.hasMissedCheckout.and.returnValue(
        throwError(() => new Error('network'))
      );
      fillForm();
      component.login();
      expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/dashboard');
      expect(dialogSpy.open).not.toHaveBeenCalled();
    });
  });

  // ── login() — auth error ──────────────────────────────────────────────────

  describe('login() — auth error', () => {
    it('should show the server error message', () => {
      authSpy.login.and.returnValue(
        throwError(() => new HttpErrorResponse({ error: { message: 'Bad credentials' } }))
      );
      fillForm();
      component.login();
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Bad credentials', 'Close', jasmine.objectContaining({ duration: 5000 })
      );
    });

    it('should fall back to "Login failed" when error has no message', () => {
      authSpy.login.and.returnValue(
        throwError(() => new HttpErrorResponse({ error: {} }))
      );
      fillForm();
      component.login();
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Login failed', 'Close', jasmine.objectContaining({ duration: 5000 })
      );
    });

    it('should reset isSubmitting to false on error', () => {
      authSpy.login.and.returnValue(
        throwError(() => new HttpErrorResponse({ error: {} }))
      );
      fillForm();
      component.login();
      expect(component.isSubmitting).toBeFalse();
    });

    it('should not navigate on error', () => {
      authSpy.login.and.returnValue(
        throwError(() => new HttpErrorResponse({ error: {} }))
      );
      fillForm();
      component.login();
      expect(routerSpy.navigateByUrl).not.toHaveBeenCalled();
    });
  });
});