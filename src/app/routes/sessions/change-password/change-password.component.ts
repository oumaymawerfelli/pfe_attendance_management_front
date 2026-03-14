// ============================================================
// change-password.component.ts
// ============================================================
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-change-password',
  template: `
    <mat-card class="password-card">
      <mat-card-header>
        <mat-icon mat-card-avatar color="warn">shield</mat-icon>
        <mat-card-title>Security Settings</mat-card-title>
        <mat-card-subtitle>Change your password</mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>
        <div [formGroup]="passwordForm" class="form-container">

          <!-- Current Password -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Current Password</mat-label>
            <input matInput
                   [type]="hideCurrentPassword ? 'password' : 'text'"
                   formControlName="currentPassword">
            <mat-icon matPrefix>lock</mat-icon>
            <button type="button" mat-icon-button matSuffix
                    (click)="hideCurrentPassword = !hideCurrentPassword">
              <mat-icon>{{ hideCurrentPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            <mat-error *ngIf="passwordForm.get('currentPassword')?.hasError('required')">
              Current password is required
            </mat-error>
          </mat-form-field>

          <!-- New Password -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>New Password</mat-label>
            <input matInput
                   [type]="hideNewPassword ? 'password' : 'text'"
                   formControlName="newPassword">
            <mat-icon matPrefix>lock_outline</mat-icon>
            <button type="button" mat-icon-button matSuffix
                    (click)="hideNewPassword = !hideNewPassword">
              <mat-icon>{{ hideNewPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            <mat-error *ngIf="passwordForm.get('newPassword')?.hasError('required')">
              New password is required
            </mat-error>
            <mat-error *ngIf="passwordForm.get('newPassword')?.hasError('minlength')">
              Minimum 8 characters
            </mat-error>
            <mat-error *ngIf="passwordForm.get('newPassword')?.hasError('pattern')">
              Must contain letter, number and special character (@$!%*#?&)
            </mat-error>
          </mat-form-field>

          <!-- Password Strength -->
          <div class="password-strength" *ngIf="passwordForm.get('newPassword')?.value">
            <div class="strength-label">
              <span>Strength:</span>
              <span [ngClass]="getStrengthClass()">{{ getStrengthLabel() }}</span>
            </div>
            <mat-progress-bar mode="determinate"
                              [value]="getStrengthValue()"
                              [color]="getStrengthColor()">
            </mat-progress-bar>
          </div>

          <!-- Confirm Password -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Confirm New Password</mat-label>
            <input matInput
                   [type]="hideConfirmPassword ? 'password' : 'text'"
                   formControlName="confirmPassword">
            <mat-icon matPrefix>lock_outline</mat-icon>
            <button type="button" mat-icon-button matSuffix
                    (click)="hideConfirmPassword = !hideConfirmPassword">
              <mat-icon>{{ hideConfirmPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            <mat-error *ngIf="passwordForm.get('confirmPassword')?.hasError('required')">
              Please confirm your new password
            </mat-error>
            <mat-error *ngIf="passwordForm.hasError('passwordMismatch')">
              ⚠️ Passwords do not match
            </mat-error>
          </mat-form-field>

          <!-- Error Message -->
          <mat-error *ngIf="errorMessage" class="error-message">
            {{ errorMessage }}
          </mat-error>

          <!-- Submit -->
          <div class="form-actions">
            <button mat-raised-button color="warn"
                    type="button"
                    [disabled]="passwordForm.invalid || isLoading"
                    (click)="onSubmit()">
              <mat-spinner *ngIf="isLoading" diameter="20"></mat-spinner>
              <mat-icon *ngIf="!isLoading">lock_reset</mat-icon>
              {{ isLoading ? 'Changing...' : 'Change Password' }}
            </button>
          </div>

        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
   :host {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 80vh;
  }
    .password-card {
       width: 600px; 
    }

    .form-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-top: 16px;
    }

    .full-width {
      width: 100%;
    }

    .password-strength {
      margin: -8px 0 8px;
    }

    .strength-label {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      margin-bottom: 4px;
    }

    .strength-weak   { color: #f44336; font-weight: 600; }
    .strength-medium { color: #ff9800; font-weight: 600; }
    .strength-strong { color: #4caf50; font-weight: 600; }

    .error-message {
      font-size: 14px;
      padding: 8px;
      background: #ffebee;
      border-radius: 4px;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 8px;
    }

    button[mat-raised-button] {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  `]
})
export class ChangePasswordComponent {

  passwordForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  hideCurrentPassword = true;
  hideNewPassword = true;
  hideConfirmPassword = true;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {
    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/)
      ]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: AbstractControl) {
    const newPass = form.get('newPassword')?.value;
    const confirm = form.get('confirmPassword')?.value;
    return newPass === confirm ? null : { passwordMismatch: true };
  }

  getStrengthValue(): number {
    const password = this.passwordForm.get('newPassword')?.value || '';
    let score = 0;
    if (password.length >= 8) score += 25;
    if (/[A-Z]/.test(password)) score += 25;
    if (/\d/.test(password)) score += 25;
    if (/[@$!%*#?&]/.test(password)) score += 25;
    return score;
  }

  getStrengthLabel(): string {
    const val = this.getStrengthValue();
    if (val <= 25) return 'Weak';
    if (val <= 50) return 'Medium';
    return 'Strong';
  }

  getStrengthClass(): string {
    const val = this.getStrengthValue();
    if (val <= 25) return 'strength-weak';
    if (val <= 50) return 'strength-medium';
    return 'strength-strong';
  }

  getStrengthColor(): string {
    const val = this.getStrengthValue();
    if (val <= 25) return 'warn';
    if (val <= 50) return 'accent';
    return 'primary';
  }

  onSubmit(): void {
    if (this.passwordForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    const body = {
      currentPassword: this.passwordForm.value.currentPassword,
      newPassword: this.passwordForm.value.newPassword,
      confirmPassword: this.passwordForm.value.confirmPassword
    };

    this.http.post('/api/auth/change-password', body).subscribe({
      next: () => {
        this.isLoading = false;
        this.passwordForm.reset();
        this.snackBar.open('✅ Password changed successfully!', 'Close', {
          duration: 4000,
          panelClass: ['snack-success']
        });
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Failed to change password';
      }
    });
  }
}