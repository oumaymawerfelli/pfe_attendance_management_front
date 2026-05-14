import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService, User } from '@core/authentication';
import { MatDialog } from '@angular/material/dialog';
import { EditProfileDialogComponent } from '../edit-profile-dialog/edit-profile-dialog.component';

@Component({
  selector: 'app-profile-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss'],
})
export class ProfileOverviewComponent implements OnInit, OnDestroy {
  user: User | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private auth: AuthService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.auth.user()
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => (this.user = user));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openEditDialog(): void {
    this.dialog.open(EditProfileDialogComponent, {
      width: '550px',
      maxWidth: '95vw',
      data: { user: this.user },
    });
  }

 contactUser(): void {
  if (this.user?.email) {
    this.navigate(`mailto:${this.user.email}`);
  }
}

protected navigate(url: string): void {
  window.location.href = url;
}
}