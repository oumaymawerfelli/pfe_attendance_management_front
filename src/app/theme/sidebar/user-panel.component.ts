import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { UserService } from '@core/services/user.service';
import { User } from '@core/authentication/interface';

@Component({
  selector: 'app-user-panel',
  template: `
    <div class="user-panel-container">
      <!-- User Info Section (click to go to profile) -->
      <div class="user-panel" *ngIf="user$ | async as user" (click)="goToProfile()">
        <div class="user-panel__avatar">
          <img [src]="'./assets/images/def-avatar.avif'" alt="Avatar" />
        </div>
        <div class="user-panel__info">
          <h4>{{ user.firstName }} {{ user.lastName }}</h4>
          <p>{{ user.email }}</p>
          <span class="badge">{{ formatRole(user.roles?.[0]) }}</span>
        </div>
      </div>

      <!-- Quick Actions Divider -->
      <mat-divider class="my-2"></mat-divider>

      <!-- Quick Actions Menu -->
      <div class="quick-actions">
        <!-- Users Management Link (only for admins/managers) -->
        <a class="action-link" routerLink="/users" routerLinkActive="active" matRipple>
          <mat-icon>people</mat-icon>
          <span>User Management</span>
          <span class="badge-count" *ngIf="pendingCount$ | async as count" [class.has-pending]="count > 0">
            {{ count > 0 ? count : '' }}
          </span>
        </a>

        <!-- Settings Link -->
        <a class="action-link" routerLink="/profile/settings" routerLinkActive="active" matRipple>
          <mat-icon>settings</mat-icon>
          <span>Settings</span>
        </a>

        <!-- Logout Link -->
        <a class="action-link" (click)="logout()" matRipple>
          <mat-icon>logout</mat-icon>
          <span>Logout</span>
        </a>
      </div>
    </div>
  `,
  styles: [
    `
      .user-panel-container {
        padding: 8px;
      }

      .user-panel {
        display: flex;
        align-items: center;
        padding: 16px;
        background: #f5f5f5;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        margin-bottom: 8px;
      }
      .user-panel:hover {
        background: #e0e0e0;
      }
      .user-panel__avatar {
        margin-right: 12px;
      }
      .user-panel__avatar img {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        object-fit: cover;
      }
      .user-panel__info {
        flex: 1;
      }
      .user-panel__info h4 {
        margin: 0 0 4px;
        font-size: 16px;
        font-weight: 500;
      }
      .user-panel__info p {
        margin: 0 0 4px;
        font-size: 14px;
        color: #666;
      }
      .badge {
        background: #ff9800;
        color: white;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        display: inline-block;
      }

      .quick-actions {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .action-link {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 16px;
        border-radius: 6px;
        color: #555;
        text-decoration: none;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
      }

      .action-link:hover {
        background: rgba(0, 0, 0, 0.04);
        color: #1976d2;
      }

      .action-link.active {
        background: rgba(25, 118, 210, 0.1);
        color: #1976d2;
        font-weight: 500;
      }

      .action-link mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: #666;
      }

      .action-link:hover mat-icon {
        color: #1976d2;
      }

      .action-link.active mat-icon {
        color: #1976d2;
      }

      .badge-count {
        margin-left: auto;
        background: #f44336;
        color: white;
        font-size: 11px;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 12px;
        min-width: 18px;
        text-align: center;
      }

      .badge-count.has-pending {
        background: #ff9800;
      }

      .my-2 {
        margin: 8px 0;
      }
    `,
  ],
})
export class UserPanelComponent implements OnInit {
  user$!: Observable<User | null>;
  pendingCount$!: Observable<number>;

  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit() {
    this.user$ = this.userService.getUser();
    // You'll need to create a service to get pending count
    // this.pendingCount$ = this.userService.getPendingCount();
  }

  formatRole(role: string | undefined): string {
    if (!role) return 'EMPLOYEE';
    let cleanRole = role.replace('ROLE_', '');
    cleanRole = cleanRole.replace(/_/g, ' ');
    return cleanRole;
  }

  goToProfile(): void {
    this.router.navigate(['/profile/overview']);
  }

  logout(): void {
    // Implement logout logic
    console.log('Logout clicked');
  }
}