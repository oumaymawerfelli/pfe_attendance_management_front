import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { filter, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from '@core/authentication';

import { AttendanceService } from '../../attendance/services/attendance.service';
import { MissedCheckoutDialogComponent } from '../../attendance/components/missed-checkout-dialog/missed-checkout-dialog.component';
import { OvertimeCheckService } from '../../attendance/services/overtime-check.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  isSubmitting = false;
  hidePassword = true;

  /** 60 tick-mark positions for the outer ring SVG (0–59) */
  readonly tickArray = Array.from({ length: 60 }, (_, i) => i);

  loginForm = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
    rememberMe: [false],
  });

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private auth: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private attendanceService: AttendanceService,
    private overtimeCheckService: OvertimeCheckService
  ) {}

  get username() {
    return this.loginForm.get('username')!;
  }
  get password() {
    return this.loginForm.get('password')!;
  }
  get rememberMe() {
    return this.loginForm.get('rememberMe')!;
  }

 login() {
  if (this.loginForm.invalid) {
    this.markFormGroupTouched(this.loginForm);
    return;
  }

  this.isSubmitting = true;
  const email = this.username.value.trim();
  const password = this.password.value.trim();

  this.auth
    .login(email, password, this.rememberMe.value)
    .pipe(
      // ✅ Real HTTP errors now propagate naturally — no need to throw manually
      switchMap(() => this.attendanceService.checkIn().pipe(catchError(() => of(null)))),
      switchMap(() =>
        this.attendanceService.hasMissedCheckout().pipe(catchError(() => of(false)))
      )
    )
    .subscribe({
      next: (hasMissed: boolean) => {
        this.isSubmitting = false;
        this.snackBar.open('Login successful!', 'Close', { duration: 3000 });
        this.overtimeCheckService.startChecking();

        if (hasMissed) {
          const dialogRef = this.dialog.open(MissedCheckoutDialogComponent, {
            width: '400px',
            disableClose: true,
          });
          dialogRef.afterClosed().subscribe(() => {
            this.router.navigateByUrl('/dashboard');
          });
        } else {
          this.router.navigateByUrl('/dashboard');
        }
      },
      error: (errorRes: HttpErrorResponse) => {
        this.isSubmitting = false;

        const message = errorRes.error?.message
                     || errorRes.error?.error
                     || this.getDefaultErrorMessage(errorRes.status);

        this.snackBar.open(message, 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar'],
          horizontalPosition: 'center',
          verticalPosition: 'top',
        });
      },
    });
}

private getDefaultErrorMessage(status: number): string {
  switch (status) {
    case 0:   return 'Unable to reach the server. Check your connection.';
    case 401: return 'Incorrect email or password.';
    case 403: return 'Access denied. Your account may be disabled.';
    case 500: return 'Server error. Please try again in a moment.';
    default:  return 'Login failed. Please try again.';
  }
}

  private markFormGroupTouched(formGroup: any) {
    Object.values(formGroup.controls).forEach((control: any) => {
      control.markAsTouched();
      if (control.controls) this.markFormGroupTouched(control);
    });
  }
}
