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
  isSaving  = false;

  avatarPreview:    string | null = null;
  selectedFile:     File   | null = null;
  isUploadingPhoto  = false;

  // Select options
  departments    = ['IT', 'HR', 'FINANCE', 'SALES', 'MARKETING', 'OPERATIONS'];
  roles          = ['EMPLOYEE', 'PROJECT_MANAGER', 'GENERAL_MANAGER', 'ADMIN'];
  genders        = ['MALE', 'FEMALE'];
  maritalStatuses = ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'];
  contractTypes  = ['CDI', 'CDD', 'CTP', 'CTT', 'STAGE', 'SIVP', 'ALTERNANCE', 'MISSION', 'FREELANCE', 'ESSAI'];

  constructor(
    private fb:           FormBuilder,
    private route:        ActivatedRoute,
    private router:       Router,
    private usersService: UsersService,
    private snackBar:     MatSnackBar
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

  // ── Status helpers (used by profile banner) ───────────────
  getStatusClass(): string {
    if (!this.user) return '';
    if (this.user.registrationPending)           return 'pending';
    if (!this.user.accountNonLocked)             return 'locked';
    if (!this.user.active || !this.user.enabled) return 'disabled';
    return 'active';
  }

  getStatusLabel(): string {
    if (!this.user) return '';
    if (this.user.registrationPending)           return 'PENDING';
    if (!this.user.accountNonLocked)             return 'LOCKED';
    if (!this.user.active || !this.user.enabled) return 'DISABLED';
    return 'ACTIVE';
  }

  getInitials(): string {
    if (!this.user) return '';
    return ((this.user.firstName?.[0] || '') + (this.user.lastName?.[0] || '')).toUpperCase();
  }

  // ── Photo ─────────────────────────────────────────────────
  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.snackBar.open('Only JPG, PNG or WebP images are allowed', 'Close', { duration: 3000 });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.snackBar.open('Image must be smaller than 5MB', 'Close', { duration: 3000 });
      return;
    }

    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = e => { this.avatarPreview = e.target?.result as string; };
    reader.readAsDataURL(file);
  }

  removePhoto(): void {
    this.avatarPreview = null;
    this.selectedFile  = null;
    if (this.fileInput) this.fileInput.nativeElement.value = '';
    if (this.user) this.user.avatar = undefined;
  }

  // ── Save ──────────────────────────────────────────────────
  saveUser(): void {
    if (this.userForm.invalid) {
      this.markFormGroupTouched(this.userForm);
      this.snackBar.open('Please fill all required fields', 'Close', { duration: 3000 });
      return;
    }
    if (!this.user) return;

    this.isSaving = true;
    this.selectedFile ? this.uploadPhotoThenSave() : this.saveFormData();
  }

  private uploadPhotoThenSave(): void {
    if (!this.selectedFile || !this.user) return;
    this.isUploadingPhoto = true;

    const formData = new FormData();
    formData.append('photo', this.selectedFile);

    this.usersService.uploadPhoto(this.user.id, formData).subscribe({
      next: response => {
        this.isUploadingPhoto = false;
        if (this.user && response.avatarUrl) {
          this.user.avatar   = response.avatarUrl;
          this.avatarPreview = null;
          this.selectedFile  = null;
        }
        this.saveFormData();
      },
      error: (err: any) => {
        this.isUploadingPhoto = false;
        this.isSaving = false;
        this.snackBar.open('Failed to upload photo: ' + (err.error?.message || 'Unknown error'), 'Close', { duration: 5000 });
      }
    });
  }

  private saveFormData(): void {
    if (!this.user) return;

    const v = this.userForm.value;
    this.usersService.updateUser(this.user.id, {
      firstName:       v.firstName,
      lastName:        v.lastName,
      email:           v.email,
      phone:           v.phone,
      birthDate:       v.birthDate,
      gender:          v.gender,
      nationality:     v.nationality,
      maritalStatus:   v.maritalStatus,
      address:         v.address,
      jobTitle:        v.jobTitle,
      department:      v.department,
      service:         v.service,
      hireDate:        v.hireDate,
      contractType:    v.contractType,
      contractEndDate: v.contractEndDate,
      description:     v.description,
      roleNames:       [v.role]
    }).subscribe({
      next: () => {
        this.snackBar.open('User updated successfully', 'Close', { duration: 3000 });
        this.isSaving = false;
        this.router.navigate(['/users', this.user?.id]);
      },
      error: (err: any) => {
        this.snackBar.open('Failed to update: ' + (err.error?.message || 'Unknown error'), 'Close', { duration: 5000 });
        this.isSaving = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(this.user ? ['/users', this.user.id] : ['/users']);
  }

  private markFormGroupTouched(fg: FormGroup): void {
    Object.values(fg.controls).forEach(c => {
      c.markAsTouched();
      if (c instanceof FormGroup) this.markFormGroupTouched(c);
    });
  }

  get firstName() { return this.userForm.get('firstName'); }
  get lastName()  { return this.userForm.get('lastName');  }
  get email()     { return this.userForm.get('email');     }
}