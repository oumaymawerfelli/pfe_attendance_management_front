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
  stats: UserStats = { active: 0, disabled: 0, pending: 0, locked: 0 };

  totalElements = 0;
  pageSize = 10;
  currentPage = 0;
  isLoading = false;
  searchKeyword = '';

  canToggleStatus = false;
  displayedColumns = ['user', 'contact', 'department', 'role', 'status', 'actions'];

  private searchSubject = new Subject<string>();
  currentUser: any = null;

  constructor(
    private usersService: UsersService,
    private auth: AuthService,
    private snackBar: MatSnackBar,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // Test token retrieval
    const rawToken = localStorage.getItem('ng-matero-token');
    console.log('📦 ===== USERS COMPONENT =====');
    console.log('📦 Token in localStorage:', rawToken ? 'Yes' : 'No');
    
    if (rawToken) {
      try {
        const parsed = JSON.parse(rawToken);
        console.log('📦 Token parsed:', parsed);
        console.log('📦 Access token exists:', !!parsed.access_token);
        console.log('📦 Bearer format:', `Bearer ${parsed.access_token}`);
      } catch (e) {
        console.error('Error parsing token:', e);
      }
    }

    // Test interceptor
    this.testInterceptor();

    this.auth.user().subscribe({
      next: (user: any) => {
        if (user && Object.keys(user).length > 0) {
          console.log('✅ User authenticated:', user.email);
          console.log('👤 Full user object:', user);
          
          // STOCKER L'UTILISATEUR
          this.currentUser = user;
          
          this.checkPermissions();
          this.loadStats();
          this.loadUsers();
        } else {
          console.log('❌ No user found, redirecting to login');
          this.router.navigate(['/auth/login']);
        }
      },
      error: (err) => {
        console.error('❌ Error getting user:', err);
        this.router.navigate(['/auth/login']);
      }
    });

    this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(keyword => {
        this.currentPage = 0;
        this.loadUsers(keyword);
      });
  }

  testInterceptor(): void {
    console.log('🧪 Testing interceptor with direct HTTP call');
    this.http.get('http://localhost:8080/api/users?page=0&size=1').subscribe({
      next: (res) => console.log('✅ Test success:', res),
      error: (err) => console.log('❌ Test error:', err)
    });
  }

  // Filter by status method
  filterByStatus(status: string): void {
    console.log('🔍 Filtering by status:', status);
    this.currentPage = 0;
    this.loadUsers();
  }

  // Apply search filter
  applyFilter(searchValue: string): void {
    this.searchKeyword = searchValue;
    this.searchSubject.next(searchValue);
  }

  private checkPermissions(): void {
    if (!this.currentUser) {
      console.log('⚠️ No current user found in checkPermissions');
      this.canToggleStatus = false;
      return;
    }
    
    const roles = this.currentUser?.roles || [];
    console.log('🔐 Current user roles from stored user:', roles);
    
    this.canToggleStatus = roles.some((r: string) =>
      r.includes('GENERAL_MANAGER') || r.includes('GENERAL_DIRECTOR') || r.includes('ADMIN')
    );
    
    console.log('🔐 canToggleStatus:', this.canToggleStatus);
  }

  loadStats(): void {
    this.usersService.getStats().subscribe({
      next: (stats: UserStats) => {
        this.stats = stats;
      },
      error: () => {
        this.snackBar.open('Failed to load statistics', 'Close', { duration: 3000 });
      }
    });
  }

  loadUsers(keyword = this.searchKeyword): void {
    this.isLoading = true;
    
    this.usersService.getUsers(this.currentPage, this.pageSize, keyword).subscribe({
      next: (res: PageResponse<UserDTO>) => {
        console.log('📦 Raw user data from backend:', res.content);
        
        this.users = res.content.map(user => ({
          ...user,
          registrationPending: user.registrationPending === true,
          accountNonLocked: user.accountNonLocked === true,
          active: user.active === true,
          enabled: user.enabled === true
        }));
        
        this.totalElements = res.totalElements;
        this.isLoading = false;
        
        console.log('✅ Processed users:', this.users);
      },
      error: (err: any) => {
        console.error('❌ Error loading users:', err);
        this.snackBar.open('Failed to load users', 'Close', { duration: 3000 });
        this.isLoading = false;
        
        if (err.status === 401 || err.status === 403) {
          this.router.navigate(['/auth/login']);
        }
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadUsers();
  }

  onCustomPageChange(pageIndex: number): void {
    this.currentPage = pageIndex;
    this.loadUsers();
  }

  approveUser(user: UserDTO): void {
    if (!confirm(`Approve ${user.firstName} ${user.lastName}?`)) return;

    this.usersService.approveUser(user.id).subscribe({
      next: () => {
        this.snackBar.open(`${user.firstName} ${user.lastName} approved`, 'Close', { duration: 3000 });
        this.loadUsers();
        this.loadStats();
      },
      error: () => this.snackBar.open('Failed to approve user', 'Close', { duration: 3000 })
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
      error: () => this.snackBar.open('Failed to reject user', 'Close', { duration: 3000 })
    });
  }

  disableUser(user: UserDTO): void {
    if (!confirm(`Are you sure you want to disable ${user.firstName} ${user.lastName}?`)) return;
    
    this.usersService.disableUser(user.id).subscribe({
      next: () => {
        this.snackBar.open(`${user.firstName} ${user.lastName} disabled`, 'Close', { duration: 3000 });
        this.loadUsers();
        this.loadStats();
      },
      error: () => {
        this.snackBar.open('Failed to disable user', 'Close', { duration: 3000 });
      }
    });
  }

  enableUser(user: UserDTO): void {
    if (!confirm(`Are you sure you want to enable ${user.firstName} ${user.lastName}?`)) return;
    
    this.usersService.enableUser(user.id).subscribe({
      next: () => {
        this.snackBar.open(`${user.firstName} ${user.lastName} enabled`, 'Close', { duration: 3000 });
        this.loadUsers();
        this.loadStats();
      },
      error: () => {
        this.snackBar.open('Failed to enable user', 'Close', { duration: 3000 });
      }
    });
  }

  resetPassword(user: UserDTO): void {
    if (!confirm(`Send password reset email to ${user.email}?`)) return;
    
    this.usersService.resetPassword(user.id).subscribe({
      next: () => {
        this.snackBar.open('Password reset email sent', 'Close', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('Failed to reset password', 'Close', { duration: 3000 });
      }
    });
  }

  editUser(user: UserDTO): void {
    console.log('📝 Navigating to edit user:', user.id);
    this.router.navigate(['/users', user.id, 'edit']);
  }

  getStatus(user: UserDTO): string {
    if (user.registrationPending === true) return 'pending';
    if (!user.enabled) return 'pending';
    if (user.enabled && !user.active) return 'disabled';
    if (user.accountNonLocked === false) return 'locked';
    return 'active';
  }

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

  viewUser(user: UserDTO): void {
    this.router.navigate(['/users', user.id]);
  }
}