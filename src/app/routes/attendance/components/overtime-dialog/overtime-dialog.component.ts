import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '@core/authentication';
import { catchError, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '@env/environment';

@Component({
  selector: 'app-overtime-dialog',
  templateUrl: './overtime-dialog.component.html',
})
export class OvertimeDialogComponent {
  loading = false;
  error = '';

  constructor(
    private dialogRef: MatDialogRef<OvertimeDialogComponent>,
    private auth: AuthService,
    private http: HttpClient,
    private router: Router
  ) {}

  leave() {
    this.loading = true;
    this.error = '';

    this.http
      .post(`${environment.apiUrl}/attendance/logout-checkout`, {})
      .pipe(
        catchError(() => of(null)),
        switchMap(() => this.auth.logout())
      )
      .subscribe({
        next: () => {
          this.dialogRef.close('left');
          this.router.navigate(['/auth/login']);
        },
        error: () => {
          this.loading = false;
          this.error = 'Something went wrong. Please try again.';
        },
      });
  }

  overtime() {
    // Just dismiss — checkout will happen on actual logout
    this.dialogRef.close('overtime');
  }
}
