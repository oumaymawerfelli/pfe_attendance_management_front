// src/app/routes/users/users.component.ts

import { Component, OnInit } from '@angular/core';
import { UsersService, UserDTO, UserStats, PageResponse } from './user.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '@core/authentication';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
})
export class UsersComponent implements OnInit {
  users: UserDTO[] = [];

  stats: UserStats = {
    active: 0,
    disabled: 0,
    pending: 0,
    locked: 0,
  };

  totalElements = 0;
  pageSize = 10;
  currentPage = 0;
  isLoading = false;
  searchKeyword = '';

  canToggleStatus = false;

  displayedColumns = ['user', 'contact', 'department', 'role', 'status', 'actions'];

  private searchSubject = new Subject<string>();

  currentUser: any = null;

  activeFilter: string | null = null;
  selectedDepartment: string | null = null;
  selectedRole: string | null = null;

  departments: string[] = ['IT', 'HR', 'Finance', 'Operations', 'Marketing'];

  availableRoles: string[] = [
    'Admin',
    'Manager',
    'Employee',
    'General Director',
  ];

  constructor(
    private usersService: UsersService,
    private auth: AuthService,
    private snackBar: MatSnackBar,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const rawToken = localStorage.getItem('ng-matero-token');

    if (rawToken) {
      try {
        const parsed = JSON.parse(rawToken);
        console.log('Access token exists:', !!parsed.access_token);
      } catch (e) {
        console.error('Error parsing token:', e);
      }
    }

    this.auth.user().subscribe({
      next: (user: any) => {
        if (user && Object.keys(user).length > 0) {
          this.currentUser = user;
          this.checkPermissions();
          this.loadStats();
          this.loadUsers();
        } else {
          this.router.navigate(['/auth/login']);
        }
      },
      error: () => this.router.navigate(['/auth/login']),
    });

    this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(keyword => {
        this.currentPage = 0;
        this.loadUsers(keyword);
      });
  }

  // ============================================================================
  // FILTERS
  // ============================================================================

  filterByStatus(status: string): void {
    this.activeFilter = this.activeFilter === status ? null : status;
    this.currentPage = 0;
    this.loadUsers();
  }

  filterByDepartment(dept: string | null): void {
    this.selectedDepartment = dept;
    this.currentPage = 0;
    this.loadUsers();
  }

  filterByRole(role: string | null): void {
    this.selectedRole = role;
    this.currentPage = 0;
    this.loadUsers();
  }

  resetFilters(): void {
    this.activeFilter = null;
    this.selectedDepartment = null;
    this.selectedRole = null;
    this.searchKeyword = '';
    this.currentPage = 0;
    this.loadUsers('');
  }

  applyFilter(searchValue: string): void {
    this.searchKeyword = searchValue;
    this.searchSubject.next(searchValue);
  }

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  addUser(): void {
    this.router.navigate(['/users/new']);
  }

  viewUser(user: UserDTO): void {
    this.router.navigate(['/users', user.id]);
  }

  editUser(user: UserDTO): void {
    this.router.navigate(['/users', user.id, 'edit']);
  }

  exportUsers(): void {
    this.snackBar.open('Exporting users...', 'Close', { duration: 2000 });
  }

  // ============================================================================
  // PERMISSIONS
  // ============================================================================

  private checkPermissions(): void {
    if (!this.currentUser) {
      this.canToggleStatus = false;
      return;
    }

    const roles = this.currentUser?.roles || [];

    this.canToggleStatus = roles.some(
      (r: string) =>
        r.includes('GENERAL_MANAGER') ||
        r.includes('GENERAL_DIRECTOR') ||
        r.includes('ADMIN')
    );
  }

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  loadStats(): void {
    this.usersService.getStats().subscribe({
      next: (stats: UserStats) => (this.stats = stats),
      error: () => this.snackBar.open('Failed to load statistics', 'Close', { duration: 3000 }),
    });
  }

  loadUsers(keyword = this.searchKeyword): void {
    this.isLoading = true;

    this.usersService.getUsers(this.currentPage, this.pageSize, keyword).subscribe({
      next: (res: PageResponse<UserDTO>) => {
        let mapped = res.content.map(user => ({
          ...user,
          registrationPending:   user.registrationPending          === true,
          registrationRejected:  (user as any).registrationRejected === true,   // ← not yet in DTO
          accountNonLocked:      user.accountNonLocked              === true,
          active:                user.active                        === true,
          enabled:               user.enabled                       === true,
        }));

        // Client-side filtering
        if (this.activeFilter) {
          mapped = mapped.filter(u => this.getStatus(u).toUpperCase() === this.activeFilter);
        }
        if (this.selectedDepartment) {
          mapped = mapped.filter(u => u.department === this.selectedDepartment);
        }
        if (this.selectedRole) {
          mapped = mapped.filter(
            u => this.getRoleLabel(u).toLowerCase() === this.selectedRole!.toLowerCase()
          );
        }

        this.users = mapped;
        this.totalElements = res.totalElements;
        this.isLoading = false;
      },
      error: (err: any) => {
        this.snackBar.open('Failed to load users', 'Close', { duration: 3000 });
        this.isLoading = false;
        if (err.status === 401 || err.status === 403) {
          this.router.navigate(['/auth/login']);
        }
      },
    });
  }

  // ============================================================================
  // PAGINATION
  // ============================================================================

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadUsers();
  }

  onCustomPageChange(pageIndex: number): void {
    this.currentPage = pageIndex;
    this.loadUsers();
  }

  // ============================================================================
  // USER ACTIONS
  // ============================================================================

  approveUser(user: UserDTO): void {
    if (!confirm(`Approve ${user.firstName} ${user.lastName}?`)) return;

    this.usersService.approveUser(user.id).subscribe({
      next: () => {
        this.snackBar.open(`${user.firstName} ${user.lastName} approved`, 'Close', { duration: 3000 });
        this.loadUsers();
        this.loadStats();
      },
      error: () => this.snackBar.open('Failed to approve user', 'Close', { duration: 3000 }),
    });
  }

  rejectUser(user: UserDTO): void {
    if (!confirm(`Reject ${user.firstName} ${user.lastName}?`)) return;

    this.usersService.rejectUser(user.id).subscribe({
      next: () => {
        this.snackBar.open(`${user.firstName} ${user.lastName} rejected`, 'Close', { duration: 3000 });
        this.loadUsers();
        this.loadStats();
      },
      error: () => this.snackBar.open('Failed to reject user', 'Close', { duration: 3000 }),
    });
  }

  disableUser(user: UserDTO): void {
    if (!confirm(`Disable ${user.firstName} ${user.lastName}?`)) return;

    this.usersService.disableUser(user.id).subscribe({
      next: () => {
        this.snackBar.open(`${user.firstName} ${user.lastName} disabled`, 'Close', { duration: 3000 });
        this.loadUsers();
        this.loadStats();
      },
      error: () => this.snackBar.open('Failed to disable user', 'Close', { duration: 3000 }),
    });
  }

  enableUser(user: UserDTO): void {
    if (!confirm(`Enable ${user.firstName} ${user.lastName}?`)) return;

    this.usersService.enableUser(user.id).subscribe({
      next: () => {
        this.snackBar.open(`${user.firstName} ${user.lastName} enabled`, 'Close', { duration: 3000 });
        this.loadUsers();
        this.loadStats();
      },
      error: () => this.snackBar.open('Failed to enable user', 'Close', { duration: 3000 }),
    });
  }

  resetPassword(user: UserDTO): void {
    if (!confirm(`Send password reset email to ${user.email}?`)) return;

    this.usersService.resetPassword(user.id).subscribe({
      next: () => this.snackBar.open('Password reset email sent', 'Close', { duration: 3000 }),
      error: () => this.snackBar.open('Failed to reset password', 'Close', { duration: 3000 }),
    });
  }

  // ============================================================================
  // STATUS — priority order matters
  // ============================================================================

  getStatus(user: UserDTO): string {
    // 1. Explicitly rejected at registration
    if ((user as any).registrationRejected === true) return 'rejected';

    // 2. Awaiting approval
    if (user.registrationPending === true) return 'pending';
    if (!user.enabled) return 'pending';

    // 3. Locked out (too many failed attempts, etc.)
    if (user.accountNonLocked === false) return 'locked';

    // 4. Account intentionally disabled by admin
    if (user.enabled && !user.active) return 'disabled';

    // 5. Fully active
    return 'active';
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  getInitials(user: UserDTO): string {
    return ((user.firstName?.[0] || '') + (user.lastName?.[0] || '')).toUpperCase();
  }

  getRoleLabel(user: UserDTO): string {
    if (!user.roles?.length) return 'EMPLOYEE';
    return user.roles[0].replace('ROLE_', '').replace(/_/g, ' ');
  }

  min(a: number, b: number): number {
    return Math.min(a, b);
  }
}