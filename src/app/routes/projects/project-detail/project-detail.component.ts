import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ProjectService, Project, TeamMember, StatusHistory } from '../project.service';
import { AuthService } from '@core/authentication';
import { TeamAssignDialogComponent } from '../team-assign-dialog/team-assign-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { StatusUpdateDialogComponent, StatusUpdateDialogData } from '../status-update-dialog/status-update-dialog.component';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';

export interface ActivityItem {
  title:    string;
  date:     string;
  actor:    string;
  dotClass: string;
}

@Component({
  selector: 'app-project-detail',
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.scss'],
})
export class ProjectDetailComponent implements OnInit, OnDestroy {

  project:       Project | null   = null;
  teamMembers:   TeamMember[]     = [];
  statusHistory: StatusHistory[]  = [];

  isLoading        = true;
  isLoadingTeam    = true;
  isLoadingHistory = false;

  isAdminOrGM   = false;
  canManageTeam = false;

  private destroy$ = new Subject<void>();
  private readonly requiresReason = new Set(['CANCELLED', 'ON_HOLD']);

  statuses = [
    { value: 'PLANNED',     label: 'Planned',     description: 'Project is planned'      },
    { value: 'IN_PROGRESS', label: 'In Progress', description: 'Work is in progress'     },
    { value: 'ON_HOLD',     label: 'On Hold',     description: 'Project is on hold'      },
    { value: 'COMPLETED',   label: 'Completed',   description: 'Project is completed'    },
    { value: 'CANCELLED',   label: 'Cancelled',   description: 'Project was cancelled'   },
  ];

  constructor(
    private projectService: ProjectService,
    private route:          ActivatedRoute,
    private snackBar:       MatSnackBar,
    private dialog:         MatDialog,
    private router:         Router,
    private authService:    AuthService,
  ) {}

  ngOnInit(): void {
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.loadProject(id);
    this.loadTeam(id);
    this.loadStatusHistory(id);
    this.resolveRoles();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Role resolution ───────────────────────────────────────────────────────

  private resolveRoles(): void {
    this.authService.user()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user: any) => {
          if (!user) return;
          const roles = this.extractRoleNames(user);
          this.isAdminOrGM   = roles.some(r => r.includes('ADMIN') || r.includes('GENERAL_MANAGER'));
          this.canManageTeam = roles.some(r =>
            r.includes('ADMIN') || r.includes('GENERAL_MANAGER') || r.includes('PROJECT_MANAGER'),
          );
        },
        error: () => { this.isAdminOrGM = false; this.canManageTeam = false; },
      });
  }

  private extractRoleNames(user: any): string[] {
    const raw = user?.roles ?? [];
    const arr: any[] = Array.isArray(raw) ? raw : [raw];
    return arr.map((r: any) =>
      typeof r === 'string' ? r : (r?.name ?? r?.authority ?? ''),
    );
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  loadProject(id: number): void {
    this.isLoading = true;
    this.projectService.getById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: p => { this.project = p; this.isLoading = false; },
        error: err => {
          this.isLoading = false;
          if (Array.isArray(err)) return;
          this.snackBar.open('Project not found', 'Close', { duration: 3000 });
          this.router.navigate(['/projects']);
        },
      });
  }

  loadTeam(id: number): void {
    this.isLoadingTeam = true;
    this.projectService.getTeamMembers(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: members => { this.teamMembers = members; this.isLoadingTeam = false; },
        error: err => {
          this.isLoadingTeam = false;
          if (Array.isArray(err)) return;
          this.snackBar.open('Failed to load team', 'Close', { duration: 3000 });
        },
      });
  }

  loadStatusHistory(id: number): void {
    this.isLoadingHistory = true;
    this.projectService.getStatusHistory(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: history => { this.statusHistory = history; this.isLoadingHistory = false; },
        error: () => { this.isLoadingHistory = false; },
      });
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  openAssignDialog(): void {
    if (!this.project) return;
    const id = this.project.id;
    const ref = this.dialog.open(TeamAssignDialogComponent, {
      width: '500px',
      data: { projectId: id, projectName: this.project.name, currentTeamIds: this.teamMembers.map(m => m.id) },
    });
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (result?.assigned) {
        this.loadTeam(id);
        this.snackBar.open(`${result.employee.firstName} ${result.employee.lastName} assigned!`, 'Close', { duration: 3000 });
      }
    });
  }

  removeMember(member: TeamMember): void {
    if (!this.project) return;
    const id         = this.project.id;
    const memberName = `${member.firstName} ${member.lastName}`;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: { title: 'Remove Team Member', message: `Remove ${memberName} from this project?`, confirmLabel: 'Remove', confirmColor: 'warn' },
    });
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      this.projectService.removeTeamMember(member.assignmentId ?? member.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.loadTeam(id); this.snackBar.open(`${memberName} removed`, 'Close', { duration: 3000 }); },
          error: err => {
            if (Array.isArray(err)) return;
            this.snackBar.open(err.error?.message || 'Failed to remove member', 'Close', { duration: 5000 });
          },
        });
    });
  }

  updateStatus(newStatus: string): void {
    if (!this.project) return;
    const id = this.project.id;
    const ref = this.dialog.open(StatusUpdateDialogComponent, {
      width: '480px',
      data: {
        projectName:    this.project.name,
        currentStatus:  this.project.status,
        newStatus,
        newStatusLabel: this.getStatusLabel(newStatus),
        requiresReason: this.requiresReason.has(newStatus),
      } as StatusUpdateDialogData,
    });
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(reason => {
      if (reason === null || reason === undefined) return;
      this.projectService.updateStatus(id, newStatus, reason)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: updated => {
            this.project = updated;
            this.snackBar.open('Status updated', 'Close', { duration: 2000 });
            this.loadStatusHistory(id);
          },
          error: err => {
            if (Array.isArray(err)) return;
            this.snackBar.open('Failed to update status', 'Close', { duration: 3000 });
          },
        });
    });
  }

  editProject():   void { this.router.navigate(['/projects', this.project!.id, 'edit']); }
  goBack():        void { this.router.navigate(['/projects']); }

  deleteProject(): void {
    if (!this.project) return;
    const id = this.project.id;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: { title: 'Delete Project', message: `Delete "${this.project.name}"? This cannot be undone.`, confirmLabel: 'Delete', confirmColor: 'warn' },
    });
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      this.projectService.delete(id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.snackBar.open('Project deleted', 'Close', { duration: 3000 }); this.router.navigate(['/projects']); },
          error: err => {
            if (Array.isArray(err)) return;
            this.snackBar.open(err.error?.message || 'Failed to delete', 'Close', { duration: 3000 });
          },
        });
    });
  }

  // ── Computed getters ──────────────────────────────────────────────────────

  /** e.g. "15 Days" or "—" */
  get projectDuration(): string {
    if (!this.project?.startDate || !this.project?.endDate) return '—';
    const start = new Date(this.project.startDate);
    const end   = new Date(this.project.endDate);
    const days  = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return days > 0 ? `${days} Days` : '—';
  }

  /** Recent activity derived from creation + status history */
  get recentActivity(): ActivityItem[] {
    const items: ActivityItem[] = [];

    if (this.project?.createdAt) {
      items.push({
        title:    'Project created',
        date:     this.project.createdAt as string,
        actor:    this.project.projectManagerName || 'System',
        dotClass: '',
      });
    }

    const historyItems = [...this.statusHistory].reverse().slice(0, 4);
    for (const h of historyItems) {
      items.push({
        title:    `Status set to ${this.getStatusLabel(h.toStatus)}`,
        date:     h.changedAt,
        actor:    h.changedBy,
        dotClass: '',
      });
    }

    return items.slice(0, 5);
  }

  // ── Template helpers ──────────────────────────────────────────────────────

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      PLANNED: 'Planned', IN_PROGRESS: 'In Progress',
      ON_HOLD: 'On Hold', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
    };
    return labels[status] ?? status;
  }

  getInitials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2)
      .map(n => n[0].toUpperCase()).join('');
  }

  isOverdue(p: Project | null): boolean {
    if (!p?.endDate) return false;
    if (p.status === 'COMPLETED' || p.status === 'CANCELLED') return false;
    return new Date(p.endDate) < new Date();
  }
}