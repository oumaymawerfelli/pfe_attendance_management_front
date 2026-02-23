import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService, User } from '@core/authentication';
import { MatDialog } from '@angular/material/dialog';
import { EditProfileDialogComponent } from '../edit-profile-dialog/edit-profile-dialog.component';

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
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadUser();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUser(): void {
    this.auth.user()
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.user = user;
        if (user?.avatar) {
          this.avatarUrl = user.avatar;
        }
      });
  }

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
          this.loadUser();
        }
      });
  }

  contactUser(): void {
  if (this.user?.email) {
    window.location.href = `mailto:${this.user.email}`;
  }
}
}