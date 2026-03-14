// src/app/routes/users/edit/edit.component.ts
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UsersService, UserResponseDTO } from '../user.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-user-edit',
  templateUrl: './edit.component.html',
  styleUrls: ['./edit.component.scss']
})
export class EditComponent implements OnInit {

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  userForm: FormGroup;
  user: UserResponseDTO | null = null;
  isLoading = true;
  isSaving = false;

  // Photo upload
  avatarPreview: string | null = null;
  selectedFile: File | null = null;
  isUploadingPhoto = false;

  // Select options
  departments = ['IT', 'HR', 'FINANCE', 'SALES', 'MARKETING', 'OPERATIONS'];
  roles = ['EMPLOYEE', 'MANAGER', 'ADMIN', 'GENERAL_MANAGER'];
  genders = ['MALE', 'FEMALE'];
  maritalStatuses = ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'];
  contractTypes = ['CDI', 'CDD', 'FREELANCE', 'INTERN'];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private usersService: UsersService,
    private snackBar: MatSnackBar
  ) {
    this.userForm = this.fb.group({
      firstName:       ['', Validators.required],
      lastName:        ['', Validators.required],
      email:           ['', [Validators.required, Validators.email]],
      phone:           [''],
      birthDate:       [''],
      gender:          [''],
      nationality:     [''],
      maritalStatus:   [''],
      address:         [''],
      jobTitle:        [''],
      department:      [''],
      service:         [''],
      hireDate:        [''],
      contractType:    [''],
      contractEndDate: [''],
      role:            ['EMPLOYEE'],
      description:     ['']
    });
  }

  ngOnInit(): void {
    const userId = this.route.snapshot.params.id;
    this.loadUser(userId);
  }

  // ── Load user ──────────────────────────────────────────────
  loadUser(id: number): void {
    this.isLoading = true;
    this.usersService.getUser(id).subscribe({
      next: (user: UserResponseDTO) => {
        this.user = user;
        this.userForm.patchValue({
          firstName:       user.firstName,
          lastName:        user.lastName,
          email:           user.email,
          phone:           user.phone || '',
          birthDate:       user.birthDate,
          gender:          user.gender || '',
          nationality:     user.nationality || '',
          maritalStatus:   user.maritalStatus || '',
          address:         user.address || '',
          jobTitle:        user.jobTitle || '',
          department:      user.department || '',
          service:         user.service || '',
          hireDate:        user.hireDate,
          contractType:    user.contractType || '',
          contractEndDate: user.contractEndDate,
          role:            user.roles?.[0] || 'EMPLOYEE',
          description:     user.description || ''
        });
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error loading user:', err);
        this.snackBar.open('Failed to load user', 'Close', { duration: 3000 });
        this.isLoading = false;
        this.router.navigate(['/users']);
      }
    });
  }

  // ── Photo upload ───────────────────────────────────────────

  /** Open the hidden file input */
  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  /** Handle file selection — validate + preview */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    // Validate type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.snackBar.open('Only JPG, PNG or WebP images are allowed', 'Close', { duration: 3000 });
      return;
    }

    // Validate size (5MB max)
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      this.snackBar.open('Image must be smaller than 5MB', 'Close', { duration: 3000 });
      return;
    }

    this.selectedFile = file;

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
      this.avatarPreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  /** Remove selected/existing photo */
  removePhoto(): void {
    this.avatarPreview = null;
    this.selectedFile = null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
    if (this.user) {
      this.user.avatar = undefined;
    }
  }

  // ── Save user ──────────────────────────────────────────────
  saveUser(): void {
    if (this.userForm.invalid) {
      this.markFormGroupTouched(this.userForm);
      this.snackBar.open('Please fill all required fields', 'Close', { duration: 3000 });
      return;
    }
    if (!this.user) return;

    this.isSaving = true;

    // If a new photo was selected, upload it first then save the form
    if (this.selectedFile) {
      this.uploadPhotoThenSave();
    } else {
      this.saveFormData();
    }
  }

  /** Upload photo first, then save the rest of the form */
  private uploadPhotoThenSave(): void {
    if (!this.selectedFile || !this.user) return;

    this.isUploadingPhoto = true;

    const formData = new FormData();
    formData.append('photo', this.selectedFile);

    this.usersService.uploadPhoto(this.user.id, formData).subscribe({
      next: (response) => {
        console.log('✅ Photo uploaded:', response);
        this.isUploadingPhoto = false;
        // Update local avatar URL with the one returned by backend
        if (this.user && response.avatarUrl) {
          this.user.avatar = response.avatarUrl;
          this.avatarPreview = null;
          this.selectedFile = null;
        }
        // Now save the rest of the form data
        this.saveFormData();
      },
      error: (err: any) => {
        console.error('Error uploading photo:', err);
        this.isUploadingPhoto = false;
        this.isSaving = false;
        this.snackBar.open('Failed to upload photo: ' + (err.error?.message || 'Unknown error'), 'Close', { duration: 5000 });
      }
    });
  }

  /** Save the main form data */
  private saveFormData(): void {
    if (!this.user) return;

    const formValue = this.userForm.value;
    const updatedUser = {
      firstName:       formValue.firstName,
      lastName:        formValue.lastName,
      email:           formValue.email,
      phone:           formValue.phone,
      birthDate:       formValue.birthDate,
      gender:          formValue.gender,
      nationality:     formValue.nationality,
      maritalStatus:   formValue.maritalStatus,
      address:         formValue.address,
      jobTitle:        formValue.jobTitle,
      department:      formValue.department,
      service:         formValue.service,
      hireDate:        formValue.hireDate,
      contractType:    formValue.contractType,
      contractEndDate: formValue.contractEndDate,
      description:     formValue.description,
      roleNames:       [formValue.role]
    };

    this.usersService.updateUser(this.user.id, updatedUser).subscribe({
      next: () => {
        this.snackBar.open('User updated successfully', 'Close', { duration: 3000 });
        this.isSaving = false;
        this.router.navigate(['/users', this.user?.id]);
      },
      error: (err: any) => {
        console.error('Error updating user:', err);
        this.snackBar.open('Failed to update user: ' + (err.error?.message || 'Unknown error'), 'Close', { duration: 5000 });
        this.isSaving = false;
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────
  cancel(): void {
    this.router.navigate(this.user ? ['/users', this.user.id] : ['/users']);
  }

  getInitials(): string {
    if (!this.user) return '';
    return ((this.user.firstName?.[0] || '') + (this.user.lastName?.[0] || '')).toUpperCase();
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) this.markFormGroupTouched(control);
    });
  }

  get firstName()  { return this.userForm.get('firstName'); }
  get lastName()   { return this.userForm.get('lastName'); }
  get email()      { return this.userForm.get('email'); }
}