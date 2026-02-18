// register.component.ts
import { Component } from '@angular/core';
import { FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LoginService } from '@core/authentication';
import {
  Gender,
  MaritalStatus,
  ContractType,
  RegisterPayload,
  RegistrationResponse,
} from '@core/authentication/register-request';

const GENDERS: Gender[] = ['MALE', 'FEMALE', 'OTHER'];
const MARITAL_STATUSES: MaritalStatus[] = ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'];
const CONTRACT_TYPES: ContractType[] = ['CDI', 'CDD', 'INTERNSHIP', 'FREELANCE'];
const DEPARTMENTS = ['IT', 'HR', 'FINANCE', 'OPERATIONS', 'MARKETING', 'ADMIN'];

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent {
  isSubmitting = false;
  genders = GENDERS;
  maritalStatuses = MARITAL_STATUSES;
  contractTypes = CONTRACT_TYPES;
  departments = DEPARTMENTS;

  personal = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    birthDate: ['', [Validators.required]],
    gender: ['MALE' as Gender, [Validators.required]],
    nationalId: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
    nationality: ['', [Validators.required]],
    maritalStatus: ['SINGLE' as MaritalStatus, [Validators.required]],
  });

  professional = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
    address: [''],
    jobTitle: [''],
    department: ['', [Validators.required]],
    service: [''],
    hireDate: ['', [Validators.required]],
    contractType: ['CDI' as ContractType, [Validators.required]],
    contractEndDate: [''],
    baseSalary: [0, [Validators.required, Validators.min(0.01)]],
    housingAllowance: [0, [Validators.min(0)]],
    evaluationScore: [0, [Validators.min(0), Validators.max(5)]],
    active: [true],
    socialSecurityNumber: ['', [Validators.pattern(/^[0-9]{10}$/)]],
    assignedProjectManagerId: [null as number | null],
    directManagerId: [null as number | null],
    childrenCount: [0, [Validators.min(0)]],
  });

  account = this.fb.nonNullable.group({
    agreeTerms: [false, [Validators.requiredTrue]],
  });

  registerForm = this.fb.group({
    personal: this.personal,
    professional: this.professional,
    account: this.account,
  });

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private loginService: LoginService,
    private snackBar: MatSnackBar
  ) {
    console.log('RegisterComponent constructor called');
    console.log('Current URL:', window.location.href);
  }

  matchValidator(source: string, target: string) {
    return (control: AbstractControl) => {
      const sourceControl = control.get(source)!;
      const targetControl = control.get(target)!;
      if (!targetControl) return null;
      if (targetControl.errors && !targetControl.errors.mismatch) return null;
      if (sourceControl?.value !== targetControl.value) {
        targetControl.setErrors({ mismatch: true });
        return { mismatch: true };
      }
      targetControl.setErrors(null);
      return null;
    };
  }

  onSubmit(): void {
    console.log('onSubmit called');
    console.log('Form valid:', this.registerForm.valid);
    console.log('isSubmitting:', this.isSubmitting);

    if (this.registerForm.invalid || this.isSubmitting) {
      console.log('Form invalid or already submitting');

      // Mark all fields as touched to show validation errors
      this.markFormGroupTouched(this.registerForm);
      return;
    }

    this.isSubmitting = true;
    console.log('Starting registration...');

    const p = this.personal.getRawValue();
    const prof = this.professional.getRawValue();

    // Format dates properly
    const formatDate = (date: any): string => {
      if (!date) return '';
      if (typeof date === 'string') return date;
      if (date instanceof Date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      return String(date);
    };

    const payload: RegisterPayload = {
      firstName: p.firstName,
      lastName: p.lastName,
      birthDate: formatDate(p.birthDate),
      gender: p.gender,
      nationalId: p.nationalId,
      nationality: p.nationality,
      maritalStatus: p.maritalStatus,
      email: prof.email,
      phone: prof.phone,
      address: prof.address || undefined,
      jobTitle: prof.jobTitle || undefined,
      department: prof.department,
      service: prof.service || undefined,
      hireDate: formatDate(prof.hireDate),
      contractType: prof.contractType,
      contractEndDate: prof.contractEndDate ? formatDate(prof.contractEndDate) : undefined,
      baseSalary: Number(prof.baseSalary),
      housingAllowance: prof.housingAllowance ? Number(prof.housingAllowance) : undefined,
      evaluationScore: prof.evaluationScore ? Number(prof.evaluationScore) : undefined,
      active: prof.active ?? true,
      socialSecurityNumber: prof.socialSecurityNumber || undefined,
      assignedProjectManagerId: prof.assignedProjectManagerId ?? undefined,
      directManagerId: prof.directManagerId ?? undefined,
      childrenCount: prof.childrenCount ? Number(prof.childrenCount) : undefined,
    };

    console.log('Payload being sent:', payload);

    this.loginService.register(payload).subscribe({
      next: (response: RegistrationResponse) => {
        console.log('Registration successful:', response);
        // Store email in localStorage as backup
        localStorage.setItem('registrationEmail', payload.email);

        this.router.navigate(['/auth/registration-success'], {
          state: {
            email: payload.email,
            message: response.message,
            userId: response.userId,
          },
        });
        this.isSubmitting = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Registration error:', err);
        this.isSubmitting = false;

        let errorMessage = 'Registration failed. Please try again.';
        if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (err.message) {
          errorMessage = err.message;
        }

        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
      },
    });
  }

  // Add this helper method
  markFormGroupTouched(formGroup: any) {
    Object.values(formGroup.controls).forEach((control: any) => {
      control.markAsTouched();
      if (control.controls) {
        this.markFormGroupTouched(control);
      }
    });
  }
}
