// src/app/routes/projects/team-assign-dialog/team-assign-dialog.component.ts
import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '@core/authentication';
import { map, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

export interface DialogData {
  projectId: number;
  projectName: string;
  currentTeamIds: number[]; // IDs already in team — to exclude from list
}

@Component({
  selector: 'app-team-assign-dialog',
templateUrl: './team-assign-dialog.component.html',
  styleUrls: ['./team-assign-dialog.component.scss']
   

})
export class TeamAssignDialogComponent implements OnInit {

  employees: any[] = [];
  filtered: any[] = [];
  selected: any = null;
  searchText = '';
  isLoading = true;
  isSubmitting = false;
  currentUserId: number | null = null;

  constructor(
    public dialogRef: MatDialogRef<TeamAssignDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Get current user ID to pass as assigningManagerId
    this.authService.user().pipe(
      map((u: any) => u?.id)
    ).subscribe(id => {
      this.currentUserId = id;
    });

    this.loadEmployees();
  }

  loadEmployees(): void {
    this.http.get<any>('/api/users?size=200').subscribe({
      next: (res: any) => {
        const all = res.content || [];
        // Exclude employees already in the team
        this.employees = all.filter((e: any) =>
          !this.data.currentTeamIds.includes(e.id)
        );
        this.filtered = [...this.employees];
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('Failed to load employees', 'Close', { duration: 3000 });
      }
    });
  }

  filterEmployees(): void {
    const q = this.searchText.toLowerCase();
    this.filtered = this.employees.filter(e =>
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q)
    );
  }

  select(emp: any): void {
    this.selected = this.selected?.id === emp.id ? null : emp;
  }

  assign(): void {
    if (!this.selected) return;
    this.isSubmitting = true;

    const payload = {
      projectId: this.data.projectId,
      employeeId: this.selected.id,
      assigningManagerId: this.currentUserId
    };

    this.http.post('/api/team-assignments', payload).subscribe({
      next: (result) => {
        this.isSubmitting = false;
        this.dialogRef.close({ assigned: true, employee: this.selected, assignment: result });
      },
      error: (err) => {
        this.isSubmitting = false;
        this.snackBar.open(err.error?.message || 'Failed to assign member', 'Close', { duration: 3000 });
      }
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).filter(Boolean).join('').toUpperCase().substring(0, 2);
  }

  formatRole(role: string | undefined): string {
    if (!role) return 'EMPLOYEE';
    return role.replace('ROLE_', '').replace(/_/g, ' ');
  }
}