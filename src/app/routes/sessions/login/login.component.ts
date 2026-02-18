import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { filter } from 'rxjs/operators';
import { AuthService } from '@core/authentication';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  isSubmitting = false;
  hidePassword = true;

  loginForm = this.fb.nonNullable.group({
    username: ['', [Validators.required]], // Can be username OR email
    password: ['', [Validators.required]],
    rememberMe: [false],
  });

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private auth: AuthService,
    private snackBar: MatSnackBar
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
      .pipe(filter((authenticated: any) => authenticated))
      .subscribe({
        next: (response: any) => {
          console.log('✅ Login successful:', response);

          // 🔍 VÉRIFICATION DU TOKEN APRÈS LOGIN
          setTimeout(() => {
            const token = localStorage.getItem('ng-matero-token');
            console.log('🔍 Token in localStorage:', token);

            if (token) {
              try {
                const tokenObj = JSON.parse(token);
                console.log('🔍 Token object:', tokenObj);
                console.log('🔍 Access token:', tokenObj.access_token);
              } catch (e) {
                console.error('❌ Error parsing token:', e);
              }
            } else {
              console.error('❌ No token found in localStorage!');
            }
          }, 100);

          this.snackBar.open('Login successful!', 'Close', { duration: 3000 });
          this.router.navigateByUrl('/dashboard');
        },
        error: (errorRes: HttpErrorResponse) => {
          console.error('❌ Login error:', errorRes);
          this.isSubmitting = false;
          const errorMessage = errorRes.error?.message || 'Login failed';
          this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
        },
      });
  }
  private markFormGroupTouched(formGroup: any) {
    Object.values(formGroup.controls).forEach((control: any) => {
      control.markAsTouched();
      if (control.controls) {
        this.markFormGroupTouched(control);
      }
    });
  }
}
