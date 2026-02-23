// src/app/routes/profile/edit-profile-dialog/edit-profile-dialog.component.ts
import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService, User } from '@core/authentication';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component'; // ← add this

@Component({
  selector: 'app-edit-profile-dialog',
  templateUrl: './edit-profile-dialog.component.html',
})
export class EditProfileDialogComponent implements OnInit {
  form!: FormGroup;
  saving = false;

  maritalStatusOptions = [
    { value: 'SINGLE', label: 'Single' },
    { value: 'MARRIED', label: 'Married' },
    { value: 'DIVORCED', label: 'Divorced' },
    { value: 'WIDOWED', label: 'Widowed' },
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EditProfileDialogComponent>,
    private snackBar: MatSnackBar,
    private http: HttpClient,
    private auth: AuthService,
    private dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: { user: User }
  ) {}

  ngOnInit(): void {
    const u = this.data.user;
    this.form = this.fb.group({
      firstName:     [u.firstName || '', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      lastName:      [u.lastName  || '', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      phone:         [u.phone     || '', [Validators.pattern(/^[0-9]{8}$/)]],
      address:       [u.address   || ''],
      maritalStatus: [u.maritalStatus || ''],
      description:   [u.description  || ''],
    });
  }

  getError(field: string): string {
    const c = this.form.get(field);
    if (c?.hasError('required'))    return 'This field is required';
    if (c?.hasError('minlength'))   return `Minimum ${c.errors?.['minlength'].requiredLength} characters`;
    if (c?.hasError('maxlength'))   return `Maximum ${c.errors?.['maxlength'].requiredLength} characters`;
    if (c?.hasError('pattern'))     return 'Must be exactly 8 digits';
    return '';
  }

  onSave(): void {
  if (this.form.invalid) return;

  const confirmRef = this.dialog.open(ConfirmDialogComponent, {
    width: '350px',
    data: { message: 'Are you sure you want to save these changes?' }
  });

  confirmRef.afterClosed().subscribe(confirmed => {
    if (!confirmed) return;

    this.saving = true;
    const userId = this.data.user.id;
    const payload = {
      firstName:     this.form.value.firstName,
      lastName:      this.form.value.lastName,
      phone:         this.form.value.phone,
      address:       this.form.value.address,
      maritalStatus: this.form.value.maritalStatus || null,
      description:   this.form.value.description,
      email:         this.data.user.email,
      birthDate:     this.data.user.birthDate,
      gender:        this.data.user.gender,
      nationalId:    this.data.user.nationalId,
      nationality:   this.data.user.nationality,
      department:    this.data.user.department,
      hireDate:      this.data.user.hireDate,
      contractType:  this.data.user.contractType,
      baseSalary:    this.data.user.baseSalary,
    };

    this.http.put(`/api/users/${userId}`, payload).subscribe({
      next: () => {
        this.saving = false;
        this.snackBar.open('Profile updated successfully!', 'Close', { duration: 3000 });
        this.dialogRef.close(this.form.value);
      },
      error: (err) => {
        this.saving = false;
        this.snackBar.open('Failed to update profile. Please try again.', 'Close', { duration: 4000 });
        console.error(err);
      }
    });
  });
}
  onCancel(): void {
    this.dialogRef.close(false);
  }
}