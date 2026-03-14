// src/app/routes/profile/edit-profile-dialog/edit-profile-dialog.component.ts
import { Component, Inject, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { AuthService, User } from '@core/authentication';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { UserService } from '@core/services/user.service'; 

@Component({
  selector: 'app-edit-profile-dialog',
  templateUrl: './edit-profile-dialog.component.html',
  styles: [`
    .dialog-content {
      min-width: 480px;
      padding-top: 8px;
    }

    /* ── Photo upload section ── */
    .photo-upload-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 16px 0 8px;
    }

    .avatar-container {
      position: relative;
      width: 90px;
      height: 90px;
      border-radius: 50%;
      overflow: hidden;
      cursor: pointer;
      background: #1565c0;
      box-shadow: 0 3px 12px rgba(21, 101, 192, 0.35);
      flex-shrink: 0;

      &:hover .avatar-overlay {
        opacity: 1;
      }
    }

    .avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .avatar-initials {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 28px;
      font-weight: 700;
    }

    .avatar-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s;
      color: white;

      mat-icon {
        font-size: 26px;
        width: 26px;
        height: 26px;
      }
    }

    .photo-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .change-photo-btn {
      border-radius: 8px !important;
      font-size: 13px !important;
    }

    .photo-hint {
      margin: 0;
      font-size: 11px;
      color: #9ca3af;
    }
  `]
})
export class EditProfileDialogComponent implements OnInit {

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  form!: FormGroup;
  saving = false;

  // Photo
  avatarPreview: string | null = null;
  selectedFile: File | null = null;

  maritalStatusOptions = [
    { value: 'SINGLE',   label: 'Single'   },
    { value: 'MARRIED',  label: 'Married'  },
    { value: 'DIVORCED', label: 'Divorced' },
    { value: 'WIDOWED',  label: 'Widowed'  },
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EditProfileDialogComponent>,
    private snackBar: MatSnackBar,
    private http: HttpClient,
    private auth: AuthService,
    private dialog: MatDialog,
    private userService: UserService,
    @Inject(MAT_DIALOG_DATA) public data: { user: User }
  ) {}

  ngOnInit(): void {
    const u = this.data.user;
    this.form = this.fb.group({
      firstName:     [u.firstName     || '', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      lastName:      [u.lastName      || '', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      phone:         [u.phone         || '', [Validators.pattern(/^[0-9]{8}$/)]],
      address:       [u.address       || ''],
      maritalStatus: [u.maritalStatus || ''],
      description:   [u.description   || ''],
    });
  }

  // ── Photo methods ──────────────────────────────────────────

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Validate type
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      this.snackBar.open('Only JPG, PNG or WebP images allowed', 'Close', { duration: 3000 });
      return;
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
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

  removePhoto(): void {
    this.avatarPreview = null;
    this.selectedFile = null;
    if (this.fileInput) this.fileInput.nativeElement.value = '';
    if (this.data.user) (this.data.user as any).avatar = null;
  }

  getInitials(): string {
    const u = this.data.user;
    return ((u.firstName?.[0] || '') + (u.lastName?.[0] || '')).toUpperCase();
  }

  // ── Save ──────────────────────────────────────────────────

  onSave(): void {
    if (this.form.invalid) return;

    const confirmRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: { message: 'Are you sure you want to save these changes?' }
    });

    confirmRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.saving = true;

      // If photo selected → upload first, then save form
      if (this.selectedFile) {
        this.uploadPhotoThenSave();
      } else {
        this.saveFormData();
      }
    });
  }

  private uploadPhotoThenSave(): void {
    const formData = new FormData();
    formData.append('photo', this.selectedFile!);

    this.http.post<{ avatarUrl: string }>(`/api/users/${this.data.user.id}/photo`, formData).subscribe({
      next: (res) => {
        // Update local user avatar so profile page refreshes
        (this.data.user as any).avatar = res.avatarUrl;
        this.avatarPreview = null;
        this.selectedFile = null;
        this.saveFormData();
      },
      error: (err) => {
        this.saving = false;
        this.snackBar.open('Failed to upload photo: ' + (err.error?.message || 'Unknown error'), 'Close', { duration: 5000 });
      }
    });
  }

  private saveFormData(): void {
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
        
        // ✅ 3. METTRE À JOUR LE USERSERVICE AVANT DE FERMER LA DIALOG
        const updatedUser = {
          ...this.data.user,
          ...payload,
          avatar: (this.data.user as any).avatar
        };
        this.userService.setUser(updatedUser);  // ← Ceci met à jour TOUS les composants
        
        this.dialogRef.close({ ...this.form.value, avatar: (this.data.user as any).avatar });
      },
      error: (err) => {
        this.saving = false;
        this.snackBar.open('Failed to update profile. Please try again.', 'Close', { duration: 4000 });
        console.error(err);
      }
    });
  }

  // ── Validation ────────────────────────────────────────────

  getError(field: string): string {
    const c = this.form.get(field);
    if (c?.hasError('required'))  return 'This field is required';
    if (c?.hasError('minlength')) return `Minimum ${c.errors?.['minlength'].requiredLength} characters`;
    if (c?.hasError('maxlength')) return `Maximum ${c.errors?.['maxlength'].requiredLength} characters`;
    if (c?.hasError('pattern'))   return 'Must be exactly 8 digits';
    return '';
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}