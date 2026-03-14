// src/app/routes/profile/profile-layout/profile-layout.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService, User } from '@core/authentication';
import { MatDialog } from '@angular/material/dialog';
import { EditProfileDialogComponent } from '../edit-profile-dialog/edit-profile-dialog.component';
import { UserService } from '@core/services/user.service';  // ✅ 1. AJOUTER L'IMPORT

@Component({
  selector: 'app-profile-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
})
export class ProfileLayoutComponent implements OnInit, OnDestroy {
  user: User = {};
  avatarUrl = './assets/images/def-avatar.avif';
  private destroy$ = new Subject<void>();

  constructor(
    private auth: AuthService,
    private dialog: MatDialog,
    private userService: UserService  // ✅ 2. AJOUTER DANS LE CONSTRUCTEUR
  ) {}

  ngOnInit(): void {
    // ✅ 3. CHANGER : ÉCOUTER LE USERSERVICE AU LIEU DE AUTH.SERVICE
    this.userService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          this.user = user;
          this.avatarUrl = user.avatar || './assets/images/def-avatar.avif';
        }
      });

    // Charger l'utilisateur initial depuis AuthService
    this.auth.user()
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user && Object.keys(user).length > 0) {
          this.userService.setUser(user);  // ✅ Initialiser le service
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // La méthode loadUser() n'est plus nécessaire - on peut la supprimer ou la garder
  // private loadUser(): void { ... }

  get role(): string {
    if (this.user.roles && this.user.roles.length > 0) {
      return this.user.roles[0]
        .replace('ROLE_', '')
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, l => l.toUpperCase());
    }
    return 'Employee';
  }

  openEditDialog(): void {
    const dialogRef = this.dialog.open(EditProfileDialogComponent, {
      width: '550px',
      maxWidth: '95vw',
      data: { user: this.user },
      disableClose: false,
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          // Plus besoin de loadUser() - UserService met déjà à jour !
          console.log('Profile updated');
        }
      });
  }

  contactUser(): void {
    if (this.user?.email) {
      window.location.href = `mailto:${this.user.email}`;
    }
  }
}