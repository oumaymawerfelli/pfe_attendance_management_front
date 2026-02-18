// src/app/routes/profile/layout/layout.component.ts
import { Component, OnInit } from '@angular/core';
import { AuthService, User } from '@core/authentication';

@Component({
  selector: 'app-profile-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
})
export class ProfileLayoutComponent implements OnInit {
  user: User = {};

  constructor(private auth: AuthService) {}

  ngOnInit(): void {
    this.auth.user().subscribe(user => {
      console.log('👤 Profile Layout - User loaded:', user);
      this.user = user;
    });
  }

  // Pour l'avatar par défaut si pas d'image
  get avatarUrl(): string {
    return this.user.avatar || './assets/images/def-avatar.avif';
  }

  // Formater le rôle
  get role(): string {
    if (this.user.roles && this.user.roles.length > 0) {
      return this.user.roles[0].replace('ROLE_', '').replace(/_/g, ' ');
    }
    return 'EMPLOYEE';
  }
}
