import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { ProjectService, Project } from '../project.service';
import { AuthService } from '@core/authentication';
import { map, debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-project-list',
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.scss']
})
export class ProjectListComponent implements OnInit, OnDestroy {

  projects:    Project[] = [];
  allProjects: Project[] = [];

  totalElements = 0;
  pageSize      = 10;
  currentPage   = 0;
  isLoading     = false;

  // Resolved to a plain boolean — used directly in template (no async pipe needed)
  isGM  = false;

  searchKeyword   = '';
  selectedManager = '';
  managerOptions: string[] = [];

  private searchSubject = new Subject<string>();
  private destroy$      = new Subject<void>();

  constructor(
    private projectService: ProjectService,
    private router:         Router,
    private snackBar:       MatSnackBar,
    private authService:    AuthService,
  ) {}

ngOnInit(): void {
  this.authService.user()
    .pipe(
      takeUntil(this.destroy$),
      map((user: any) => {
        if (!user?.roles) return false;
        const roles = Array.isArray(user.roles) ? user.roles : [user.roles];
        return roles.some((r: any) => {
          const name = typeof r === 'string' ? r : (r?.name ?? r?.authority ?? '');
          return name.includes('GENERAL_MANAGER');  // ← retire ADMIN
        });
      })
    )
    .subscribe(val => this.isGM = val);

    this.loadProjects();

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(() => this.applyFilters());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Data ──────────────────────────────────────────────────────────────────

  loadProjects(): void {
    this.isLoading = true;
    this.projectService.getAll(this.currentPage, this.pageSize).subscribe({
      next: res => {
        this.allProjects   = res.content;
        this.totalElements = res.totalElements;
        this.buildManagerOptions();
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load projects', 'Close', { duration: 3000 });
        this.isLoading = false;
      },
    });
  }

  private buildManagerOptions(): void {
    const names = this.allProjects
      .map(p => p.projectManagerName)
      .filter((n): n is string => !!n);
    this.managerOptions = [...new Set(names)].sort();
  }

  applyFilters(): void {
    const keyword = this.searchKeyword.toLowerCase().trim();
    const manager = this.selectedManager;
    this.projects = this.allProjects.filter(p => {
      const matchesSearch =
        !keyword ||
        p.name?.toLowerCase().includes(keyword) ||
        p.code?.toLowerCase().includes(keyword) ||
        p.description?.toLowerCase().includes(keyword);
      const matchesManager = !manager || p.projectManagerName === manager;
      return matchesSearch && matchesManager;
    });
  }

  onSearchChange(value: string): void {
    this.searchKeyword = value;
    this.searchSubject.next(value);
  }

  clearFilters(): void {
    this.searchKeyword   = '';
    this.selectedManager = '';
    this.applyFilters();
  }

  get hasActiveFilters(): boolean {
    return !!this.searchKeyword || !!this.selectedManager;
  }

  // ── Pagination ────────────────────────────────────────────────────────────

  get pageStart(): number {
    return this.totalElements === 0 ? 0 : this.currentPage * this.pageSize + 1;
  }

  get pageEnd(): number {
    return Math.min((this.currentPage + 1) * this.pageSize, this.totalElements);
  }

  prevPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadProjects();
    }
  }

  nextPage(): void {
    if (this.pageEnd < this.totalElements) {
      this.currentPage++;
      this.loadProjects();
    }
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize    = event.pageSize;
    this.loadProjects();
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  createProject(): void {
    this.router.navigate(['/projects/new']);
  }

  viewProject(project: Project): void {
    this.router.navigate(['/projects', project.id]);
  }

  editProject(project: Project): void {
    this.router.navigate(['/projects', project.id, 'edit']);
  }

  deleteProject(project: Project): void {
    if (!confirm(`Delete project "${project.name}"? This action cannot be undone.`)) return;
    this.projectService.delete(project.id).subscribe({
      next: () => {
        this.snackBar.open('Project deleted', 'Close', { duration: 3000 });
        this.loadProjects();
      },
      error: err => {
        this.snackBar.open(err.error?.message || 'Failed to delete project', 'Close', { duration: 3000 });
      },
    });
  }

  // ── Template helpers ──────────────────────────────────────────────────────

  countByStatus(status: string): number {
    return this.allProjects.filter(p => p.status === status).length;
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      PLANNED:     'Planned',
      IN_PROGRESS: 'In Progress',
      ON_HOLD:     'On Hold',
      COMPLETED:   'Completed',
      CANCELLED:   'Cancelled',
    };
    return labels[status] ?? status;
  }

  getInitials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2)
      .map(n => n[0].toUpperCase()).join('');
  }

  isOverdue(project: Project): boolean {
    if (!project.endDate) return false;
    if (project.status === 'COMPLETED' || project.status === 'CANCELLED') return false;
    return new Date(project.endDate) < new Date();
  }
}