import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { UserService } from '@core/services/user.service';
import { User } from '@core/authentication/interface';
import { AuthService } from '@core/authentication';

@Component({
  selector: 'app-user-panel',
template: `
  <div class="user-panel-container">
    <div class="user-panel" *ngIf="user$ | async as user" (click)="goToProfile()">
      <div class="user-panel__avatar">
        <img [src]="user?.avatar || './assets/images/def-avatar.avif'" alt="Avatar" />
      </div>
      <div class="user-panel__info">
        <h4>{{ user.firstName }} {{ user.lastName }}</h4>
        <p>{{ user.email }}</p>
        <span class="badge">{{ formatRole(user.roles?.[0]) }}</span>
      </div>
    </div>
    <mat-divider class="my-2"></mat-divider>
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
        min-height: 60px;
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

      .action-link.logout {
        margin-top: auto;
        margin-top: 40px;
        color: #f44336;
      }

      .action-link.logout mat-icon {
        color: #f44336;
      }

      .action-link.logout:hover {
        background: rgba(244, 67, 54, 0.08);
        color: #f44336;
      }

      .my-2 {
        margin: 8px 0;
      }
    `,
  ],
})
export class UserPanelComponent implements OnInit {
  user$!: Observable<User | null>;
  isAdminOrGM$!: Observable<boolean>;

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.user$ = this.userService.getUser();

    this.isAdminOrGM$ = this.authService.user().pipe(
      map((user: any) => {
        if (!user?.roles) return false;
        const roles = Array.isArray(user.roles) ? user.roles : [user.roles];
        return roles.some((r: string) =>
          r.includes('ADMIN') || r.includes('GENERAL_MANAGER') || r.includes('GENERAL_DIRECTOR')
        );
      })
    );
  }

  formatRole(role: string | undefined): string {
    if (!role) return 'EMPLOYEE';
    return role.replace('ROLE_', '').replace(/_/g, ' ');
  }

  goToProfile(): void {
    this.router.navigate(['/profile/overview']);
  }

  logout(): void {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/auth/login']);
    });
  }
}