import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { UserService } from '@core/services/user.service';
import { User } from '@core/authentication/interface';

@Component({
  selector: 'app-user-panel',
  template: `
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
  `,
  styles: [
    `
      .user-panel {
        display: flex;
        align-items: center;
        padding: 16px;
        background: #f5f5f5;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
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
      }
    `,
  ],
})
export class UserPanelComponent implements OnInit {
  user$!: Observable<User | null>;

  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit() {
    this.user$ = this.userService.getUser();
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
}
