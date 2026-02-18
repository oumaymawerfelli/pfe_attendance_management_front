// registration-success.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LoginService } from '@core/authentication';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-registration-success',
  templateUrl: './registration-success.component.html',
  styleUrls: ['./registration-success.component.scss'],
})
export class RegistrationSuccessComponent implements OnInit {
  email: string = '';
  userId: number | null = null;
  message: string = '';
  isResending = false;

  constructor(
    private router: Router,
    private snackBar: MatSnackBar,
    private loginService: LoginService
  ) {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state as any;

    if (state) {
      this.email = state.email || '';
      this.userId = state.userId || null;
      this.message = state.message || 'Registration successful!';
    }
  }

  ngOnInit() {
    if (!this.email) {
      // If no email in state, try to get from localStorage or redirect
      const savedEmail = localStorage.getItem('registrationEmail');
      if (savedEmail) {
        this.email = savedEmail;
      } else {
        this.router.navigate(['/auth/register']);
      }
    } else {
      // Save email for potential page refresh
      localStorage.setItem('registrationEmail', this.email);
    }
  }

  resendActivationEmail(): void {
    if (!this.email || this.isResending) return;

    this.isResending = true;
    this.loginService.resendActivationEmail(this.email).subscribe({
      next: (response: any) => {
        this.snackBar.open(
          response.message || 'Activation email has been resent. Please check your inbox.',
          'Close',
          { duration: 5000 }
        );
        this.isResending = false;
      },
      error: (error: HttpErrorResponse) => {
        this.snackBar.open(
          error.error?.message || 'Failed to resend activation email. Please try again.',
          'Close',
          { duration: 5000 }
        );
        this.isResending = false;
      },
    });
  }

  goToLogin(): void {
    localStorage.removeItem('registrationEmail');
    this.router.navigate(['/auth/login']);
  }
}
