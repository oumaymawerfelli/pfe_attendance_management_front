// src/app/routes/users/edit/edit.component.ts
import { Component, OnInit } from '@angular/core';
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
  userForm: FormGroup;
  user: UserResponseDTO | null = null;
  isLoading = true;
  isSaving = false;

  // Options pour les select
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
      // Informations personnelles
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      birthDate: [''],
      gender: [''],
      nationality: [''],
      maritalStatus: [''],
      address: [''],
      
      // Informations professionnelles
      jobTitle: [''],
      department: [''],
      service: [''],
      hireDate: [''],
      contractType: [''],
      contractEndDate: [''],
      
      // Rôle
      role: ['EMPLOYEE'],
      
      // Description
      description: ['']
    });
  }

  ngOnInit(): void {
    const userId = this.route.snapshot.params['id'];
    this.loadUser(userId);
  }

  loadUser(id: number): void {
  this.isLoading = true;
  this.usersService.getUser(id).subscribe({
    next: (user: UserResponseDTO) => {
      console.log('📦 Loading user for edit:', user);
      this.user = user;
      
      // Remplir le formulaire avec les données existantes
      this.userForm.patchValue({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone || '',
        birthDate: user.birthDate,
        gender: user.gender || '',
        nationality: user.nationality || '',
        maritalStatus: user.maritalStatus || '',
        address: user.address || '',
        jobTitle: user.jobTitle || '',
        department: user.department || '',
        service: user.service || '',           // ✅ Maintenant disponible
        hireDate: user.hireDate,
        contractType: user.contractType || '', // ✅ Maintenant disponible
        contractEndDate: user.contractEndDate,
        role: user.roles?.[0] || 'EMPLOYEE',
        description: user.description || ''     // ✅ Maintenant disponible
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

  saveUser(): void {
    if (this.userForm.invalid) {
      this.markFormGroupTouched(this.userForm);
      this.snackBar.open('Please fill all required fields', 'Close', { duration: 3000 });
      return;
    }

    if (!this.user) return;

    this.isSaving = true;
    
    // Préparer les données à envoyer
    const formValue = this.userForm.value;
    const updatedUser = {
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      email: formValue.email,
      phone: formValue.phone,
      birthDate: formValue.birthDate,
      gender: formValue.gender,
      nationality: formValue.nationality,
      maritalStatus: formValue.maritalStatus,
      address: formValue.address,
      jobTitle: formValue.jobTitle,
      department: formValue.department,
      service: formValue.service,
      hireDate: formValue.hireDate,
      contractType: formValue.contractType,
      contractEndDate: formValue.contractEndDate,
      description: formValue.description,
      roleNames: [formValue.role]
    };

    this.usersService.updateUser(this.user.id, updatedUser).subscribe({
      next: (updatedUser) => {
        console.log('✅ User updated successfully:', updatedUser);
        this.snackBar.open('User updated successfully', 'Close', { duration: 3000 });
        this.isSaving = false;
        this.router.navigate(['/users', this.user?.id]);
      },
      error: (err: any) => {
        console.error('Error updating user:', err);
        this.snackBar.open('Failed to update user: ' + (err.error?.message || 'Unknown error'), 
                          'Close', { duration: 5000 });
        this.isSaving = false;
      }
    });
  }

  cancel(): void {
    if (this.user) {
      this.router.navigate(['/users', this.user.id]);
    } else {
      this.router.navigate(['/users']);
    }
  }

  getInitials(): string {
    if (!this.user) return '';
    return ((this.user.firstName?.[0] || '') + (this.user.lastName?.[0] || '')).toUpperCase();
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // Getters pour les validations
  get firstName() { return this.userForm.get('firstName'); }
  get lastName() { return this.userForm.get('lastName'); }
  get email() { return this.userForm.get('email'); }
}