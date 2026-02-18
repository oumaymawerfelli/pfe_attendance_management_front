import { Component, OnInit } from '@angular/core';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';
import { AuthService, User } from '@core/authentication';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-profile-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class ProfileSettingsComponent implements OnInit {
  user!: User;
  reactiveForm = this.fb.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.pattern(/^[0-9]{8}$/)]],
    jobTitle: [''],
    department: [''],
    address: [''],
    birthDate: [''],
    gender: [''],
    nationality: [''],
    maritalStatus: [''],
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.auth.user().subscribe(user => {
      this.user = user;

      let birthDateStr = '';
      if (user.birthDate) {
        birthDateStr =
          typeof user.birthDate === 'string'
            ? user.birthDate
            : new Date(user.birthDate).toISOString().split('T')[0];
      }

      this.reactiveForm.patchValue({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        jobTitle: user.jobTitle || '',
        department: user.department || '',
        address: user.address || '',
        birthDate: birthDateStr,
        gender: user.gender || '',
        nationality: user.nationality || '',
        maritalStatus: user.maritalStatus || '',
      });
    });
  }

  onSubmit(): void {
    if (this.reactiveForm.invalid) {
      this.snackBar.open('Please fill all required fields', 'Close', { duration: 3000 });
      return;
    }
    console.log('Form value:', this.reactiveForm.value);
    this.snackBar.open('Profile updated successfully!', 'Close', { duration: 3000 });
  }

  getErrorMessage(field: string): string {
    const control = this.reactiveForm.get(field);
    if (control?.hasError('required')) {
      return 'This field is required';
    }
    if (control?.hasError('email')) {
      return 'Invalid email format';
    }
    if (control?.hasError('pattern')) {
      return 'Invalid format';
    }
    return '';
  }
}
