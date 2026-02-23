// src/app/routes/sessions/activate-account/activate-account.component.ts

import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LoginService } from '@core/authentication';

@Component({
  selector: 'app-activate-account',
  templateUrl: './activate-account.component.html',
  styleUrls: ['./activate-account.component.scss'],
})
export class ActivateAccountComponent implements OnInit {
  token: string = '';
  isLoading = true;
  isValidToken = false;
  email: string = '';
  firstName: string = '';
  lastName: string = '';
  errorMessage: string = '';

  hidePassword = true;
  hideConfirmPassword = true;

  activationForm: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private loginService: LoginService,
    private snackBar: MatSnackBar
  ) {
    this.activationForm = this.fb.group(
      {
        username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
        password: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            Validators.pattern(/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=])(?=\S+$).{8,}$/),
          ],
        ],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator }
    );
    console.log('Form created with controls:', Object.keys(this.activationForm.controls));
  }

  ngOnInit(): void {
    console.log('🔑 ActivateAccount component loaded!');
    console.log('🔑 Full URL:', window.location.href);
    console.log('🔑 Hash:', window.location.hash);
    console.log('🔑 Search:', window.location.search);

    // Try to get token from query params first
    this.route.queryParams.subscribe(params => {
      console.log('🔑 Query params:', params);
      this.token = params['token'];
      
      if (!this.token) {
        // Try to get from URL path if not in query params
        const urlParts = window.location.pathname.split('/');
        const possibleToken = urlParts[urlParts.length - 1];
        if (possibleToken && possibleToken.length > 50) { // JWT tokens are long
          this.token = possibleToken;
          console.log('🔑 Token extracted from path:', this.token);
        }
      }
      
      console.log('🔑 Final token:', this.token ? this.token.substring(0, 20) + '...' : 'No token');

      if (!this.token) {
        this.showError('No activation token provided');
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 3000);
        return;
      }

      // Validate the token
      this.validateToken();
    });
  }

  validateToken(): void {
    this.isLoading = true;
    console.log('🔍 Validating token:', this.token.substring(0, 20) + '...');
    
    this.loginService.validateActivationToken(this.token).subscribe({
      next: (response: any) => {
        console.log('✅ Token validation response:', response);
        this.isLoading = false;

        if (response.valid) {
          this.isValidToken = true;
          this.email = response.email || '';
          this.firstName = response.firstName || '';
          this.lastName = response.lastName || '';

          // Pre-fill username suggestion based on email
          if (this.email) {
            const suggestedUsername = this.email.split('@')[0];
            this.activationForm.patchValue({ username: suggestedUsername });
          }

          this.showSuccess('Token validated successfully! Please set your credentials.');
        } else {
          this.isValidToken = false;
          this.errorMessage = response.message || 'Invalid or expired token';
          this.showError(this.errorMessage);
          
          // Redirect to login after 5 seconds
          setTimeout(() => {
            this.router.navigate(['/auth/login']);
          }, 5000);
        }
      },
      error: (error) => {
        console.error('❌ Token validation error:', error);
        this.isLoading = false;
        this.isValidToken = false;
        this.errorMessage = error.error?.message || 'Failed to validate token';
        this.showError(this.errorMessage);
        
        // Redirect to login after 5 seconds
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 5000);
      },
    });
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    if (password && confirmPassword && password !== confirmPassword) {
      control.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    return null;
  }

  getPasswordStrength(): string {
    const password = this.activationForm.get('password')?.value || '';

    if (!password) return '';
    if (password.length < 8) return 'Too short';

    let strength = 0;
    if (password.match(/[a-z]+/)) strength++;
    if (password.match(/[A-Z]+/)) strength++;
    if (password.match(/[0-9]+/)) strength++;
    if (password.match(/[@$!%*#?&]+/)) strength++;

    switch (strength) {
      case 1: return 'Weak';
      case 2: return 'Medium';
      case 3: return 'Strong';
      case 4: return 'Very strong';
      default: return 'Weak';
    }
  }

  getPasswordStrengthValue(): number {
    const password = this.activationForm.get('password')?.value || '';

    if (!password) return 0;
    if (password.length < 8) return 20;

    let strength = 0;
    if (password.match(/[a-z]+/)) strength += 25;
    if (password.match(/[A-Z]+/)) strength += 25;
    if (password.match(/[0-9]+/)) strength += 25;
    if (password.match(/[@$!%*#?&]+/)) strength += 25;

    return strength;
  }

  getPasswordStrengthColor(): string {
    const value = this.getPasswordStrengthValue();
    if (value < 30) return 'warn';
    if (value < 60) return 'accent';
    return 'primary';
  }

  getPasswordStrengthClass(): string {
    const strength = this.getPasswordStrength().toLowerCase().replace(' ', '-');
    return `strength-${strength}`;
  }

  getPasswordErrors(): string[] {
    const errors: string[] = [];
    const control = this.activationForm.get('password');

    if (control?.errors) {
      if (control.errors['required']) errors.push('Password is required');
      if (control.errors['minlength']) errors.push('Password must be at least 8 characters');
      if (control.errors['pattern'])
        errors.push('Password must contain at least one letter, one number, and one special character');
    }

    return errors;
  }

  onSubmit(): void {
    if (this.activationForm.invalid) {
      this.markFormGroupTouched(this.activationForm);

      const passwordErrors = this.getPasswordErrors();
      if (passwordErrors.length > 0) {
        this.showError(passwordErrors.join('. '));
      } else if (this.activationForm.hasError('passwordMismatch')) {
        this.showError('Passwords do not match');
      }

      return;
    }

    const { username, password } = this.activationForm.value;
    this.isLoading = true;

    this.loginService.activateAccount(this.token, password, username).subscribe({
      next: (response) => {
        console.log('✅ Account activated:', response);
        this.isLoading = false;
        this.showSuccess('Account activated successfully! You can now login.');
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2000);
      },
      error: (error) => {
        console.error('❌ Activation error:', error);
        this.isLoading = false;
        this.showError(error.error?.message || 'Activation failed. Please try again.');
      },
    });
  }

  resendActivation(): void {
    if (!this.email) {
      this.showError('Email not available');
      return;
    }

    this.isLoading = true;
    this.loginService.resendActivationEmail(this.email).subscribe({
      next: (response) => {
        console.log('✅ Resend activation:', response);
        this.isLoading = false;
        this.showSuccess('Activation email resent. Please check your inbox.');
      },
      error: (error) => {
        console.error('❌ Resend error:', error);
        this.isLoading = false;
        this.showError(error.error?.message || 'Failed to resend activation email');
      },
    });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar'],
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['success-snackbar'],
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });
  }
}