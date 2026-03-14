// src/app/routes/projects/project-detail/project-detail.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ProjectService, Project, TeamMember } from '../project.service';
import { AuthService } from '@core/authentication';
import { TeamAssignDialogComponent } from '../team-assign-dialog/team-assign-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-project-detail',
  templateUrl: './project-detail.component.html',
 styleUrls: ['./project-detail.component.scss']
 })
   
export class ProjectDetailComponent implements OnInit {
  project?: Project;
  teamMembers: TeamMember[] = [];
  isLoading = true;
  isLoadingTeam = true;

  isAdminOrGM$!: Observable<boolean>;
  canManageTeam$!: Observable<boolean>;

  statuses = [
    { value: 'PLANNED',     label: '🔵 Planned' },
    { value: 'IN_PROGRESS', label: '🟢 In Progress' },
    { value: 'ON_HOLD',     label: '🟠 On Hold' },
    { value: 'COMPLETED',   label: '🟣 Completed' },
    { value: 'CANCELLED',   label: '🔴 Cancelled' },
  ];

  constructor(
    private projectService: ProjectService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
   
this.authService.user().subscribe((user: any) => {

  });

  const id = +this.route.snapshot.paramMap.get('id')!;
  this.loadProject(id);
  this.loadTeam(id);

  this.isAdminOrGM$ = this.authService.user().pipe(
  filter((user: any) => !!user?.roles),  // ← MÊME FIX
  map((user: any) => {
    const roles: string[] = Array.isArray(user.roles) ? user.roles : [user.roles];
    return roles.some(r => r.includes('ADMIN') || r.includes('GENERAL_MANAGER'));
  })
);

this.canManageTeam$ = this.authService.user().pipe(
  filter((user: any) => !!user?.roles),  // ← ATTENDRE que les rôles soient chargés
  map((user: any) => {
    const roles: string[] = Array.isArray(user.roles) ? user.roles : [user.roles];
    return roles.some(r =>
      r.includes('ADMIN') ||
      r.includes('GENERAL_MANAGER') ||
      r.includes('PROJECT_MANAGER')
    );
  })
);
  }
  loadProject(id: number): void {
    this.projectService.getById(id).subscribe({
      next: (p) => { this.project = p; this.isLoading = false; },
      error: () => {
        this.snackBar.open('Project not found', 'Close', { duration: 3000 });
        this.router.navigate(['/projects']);
      }
    });
  }

  loadTeam(id: number): void {
    this.projectService.getTeamMembers(id).subscribe({
      next: (members) => { this.teamMembers = members; this.isLoadingTeam = false; },
      error: () => { this.isLoadingTeam = false; }
    });
  }

  openAssignDialog(): void {
    const currentTeamIds = this.teamMembers.map(m => m.id);
    const ref = this.dialog.open(TeamAssignDialogComponent, {
      width: '500px',
      data: {
        projectId: this.project!.id,
        projectName: this.project!.name,
        currentTeamIds
      }
    });

    ref.afterClosed().subscribe(result => {
      if (result?.assigned) {
        this.loadTeam(this.project!.id);
        this.snackBar.open(
          `${result.employee.firstName} ${result.employee.lastName} assigned successfully!`,
          'Close',
          { duration: 3000 }
        );
      }
    });
  }

  removeMember(member: TeamMember): void {
    const memberName = `${member.firstName} ${member.lastName}`;

    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Remove Team Member',
        message: `Are you sure you want to remove ${memberName} from this project?`,
        confirmLabel: 'Remove',
        confirmColor: 'warn'
      }
    });

    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;

      const assignmentId = member.assignmentId ?? member.id;

      this.projectService.removeTeamMember(assignmentId).subscribe({
        next: () => {
          this.teamMembers = this.teamMembers.filter(m =>
            (m.assignmentId ?? m.id) !== assignmentId
          );
          this.snackBar.open(`${memberName} removed successfully`, 'Close', { duration: 3000 });
        },
        error: (err) => {
          this.snackBar.open(
            err.error?.message || 'Failed to remove member',
            'Close',
            { duration: 5000 }
          );
        }
      });
    });
  }

  updateStatus(status: string): void {
    if (!this.project) return;
    this.projectService.updateStatus(this.project.id, status).subscribe({
      next: (updated) => {
        this.project = updated;
        this.snackBar.open('Status updated', 'Close', { duration: 2000 });
      },
      error: () => this.snackBar.open('Failed to update status', 'Close', { duration: 3000 })
    });
  }

  editProject(): void {
    this.router.navigate(['/projects', this.project!.id, 'edit']);
  }

  deleteProject(): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Project',
        message: `Are you sure you want to delete "${this.project!.name}"? This action cannot be undone.`,
        confirmLabel: 'Delete',
        confirmColor: 'warn'
      }
    });

    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      this.projectService.delete(this.project!.id).subscribe({
        next: () => {
          this.snackBar.open('Project deleted', 'Close', { duration: 3000 });
          this.router.navigate(['/projects']);
        },
        error: (err) => {
          this.snackBar.open(err.error?.message || 'Failed to delete', 'Close', { duration: 3000 });
        }
      });
    });
  }

  goBack(): void {
    this.router.navigate(['/projects']);
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      PLANNED: 'Planned',
      IN_PROGRESS: 'In Progress',
      ON_HOLD: 'On Hold',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled'
    };
    return labels[status] ?? status;
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .filter(Boolean)
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  isOverdue(): boolean {
    if (!this.project?.endDate) return false;
    if (this.project.status === 'COMPLETED' || this.project.status === 'CANCELLED') return false;
    return new Date(this.project.endDate) < new Date();
  }
}