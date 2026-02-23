// src/app/routes/users/view/view.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UsersService, UserResponseDTO } from '../user.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-user-view',
  templateUrl: './view.component.html',
  styleUrls: ['./view.component.scss']
})
export class ViewComponent implements OnInit {
  user: UserResponseDTO | null = null;
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private usersService: UsersService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const userId = this.route.snapshot.params['id'];
    this.loadUser(userId);
  }

  loadUser(id: number): void {
    this.isLoading = true;
    this.usersService.getUser(id).subscribe({
      next: (user: UserResponseDTO) => {
        console.log('📦 User data from backend:', user); // Debug: voir les données reçues
        this.user = user;
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

  getStatusClass(): string {
    if (!this.user) return '';
    if (this.user.registrationPending) return 'pending';
    if (!this.user.accountNonLocked) return 'locked';
    if (!this.user.active || !this.user.enabled) return 'disabled';
    return 'active';
  }

  getStatusLabel(): string {
    if (!this.user) return '';
    if (this.user.registrationPending) return 'PENDING';
    if (!this.user.accountNonLocked) return 'LOCKED';
    if (!this.user.active || !this.user.enabled) return 'DISABLED';
    return 'ACTIVE';
  }

  getInitials(): string {
    if (!this.user) return '';
    return ((this.user.firstName?.[0] || '') + (this.user.lastName?.[0] || '')).toUpperCase();
  }

  formatDate(date?: string): string {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  goBack(): void {
    this.router.navigate(['/users']);
  }

  editUser(): void {
    if (this.user) {
      this.router.navigate(['/users', this.user.id, 'edit']);
    }
  }
}