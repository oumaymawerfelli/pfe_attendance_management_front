import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

import { RegistrationSuccessComponent } from './registration-success.component';
import { LoginService } from '@core/authentication';

describe('RegistrationSuccessComponent', () => {
  let component: RegistrationSuccessComponent;
  let fixture: ComponentFixture<RegistrationSuccessComponent>;
  let mockRouter: any; // 👈 déclarer ici
  let mockLoginService: any; // 👈
  let mockSnackBar: any; // 👈

  beforeEach(async () => {
    localStorage.removeItem('registrationEmail');

    // 👇 Recréer à chaque test pour éviter la mutation des spies
    mockRouter = {
      navigate: jasmine.createSpy('navigate'),
      getCurrentNavigation: jasmine.createSpy('getCurrentNavigation').and.returnValue({
        extras: {
          state: { email: 'test@test.com', userId: 1, message: 'Registration successful!' },
        },
      }),
    };
    mockLoginService = {
      resendActivationEmail: jasmine
        .createSpy('resendActivationEmail')
        .and.returnValue(of({ message: 'Email sent!' })),
    };
    mockSnackBar = { open: jasmine.createSpy('open') };

    await TestBed.configureTestingModule({
      declarations: [RegistrationSuccessComponent],
      imports: [TranslateModule.forRoot()],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: MatSnackBar, useValue: mockSnackBar },
        { provide: LoginService, useValue: mockLoginService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistrationSuccessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => localStorage.removeItem('registrationEmail'));

  it('should create', () => expect(component).toBeTruthy());

  it('should read email from router navigation state', () => {
    expect(component.email).toBe('test@test.com');
    expect(component.userId).toBe(1);
    expect(component.message).toBe('Registration successful!');
  });

  it('should save email to localStorage on init', () => {
    expect(localStorage.getItem('registrationEmail')).toBe('test@test.com');
  });

  it('should redirect to /auth/register if no email and no localStorage', () => {
    localStorage.removeItem('registrationEmail');
    mockRouter.getCurrentNavigation.and.returnValue(null);
    const fixture2 = TestBed.createComponent(RegistrationSuccessComponent);
    fixture2.detectChanges();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/register']);
  });

  it('should navigate to login and clear localStorage on goToLogin', () => {
    localStorage.setItem('registrationEmail', 'test@test.com');
    component.goToLogin();
    expect(localStorage.getItem('registrationEmail')).toBeNull();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('should call resendActivationEmail and show snackbar on success', () => {
    component.email = 'test@test.com';
    component.resendActivationEmail();
    expect(mockLoginService.resendActivationEmail).toHaveBeenCalledWith('test@test.com');
    expect(mockSnackBar.open).toHaveBeenCalled();
  });

  it('should not resend if already resending', () => {
    component.email = 'test@test.com';
    component.isResending = true;
    component.resendActivationEmail();
    expect(mockLoginService.resendActivationEmail).not.toHaveBeenCalled();
  });
});
