import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { ProjectService, Project } from '../project.service';
import { AuthService } from '@core/authentication';
import { map, debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-project-list',
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.scss']
})
export class ProjectListComponent implements OnInit {
  projects: Project[] = [];
  allProjects: Project[] = [];        // ← holds full unfiltered list
  totalElements = 0;
  pageSize = 10;
  currentPage = 0;
  isLoading = false;
  displayedColumns = ['code', 'name', 'status', 'manager', 'dates', 'actions'];

  // ── Search & Filter ──────────────────────────────
  searchKeyword = '';
  selectedManager = '';
  managerOptions: string[] = [];      // ← populated from loaded projects
  private searchSubject = new Subject<string>();
  // ─────────────────────────────────────────────────

  isAdminOrGM$!: Observable<boolean>;

  constructor(
    private projectService: ProjectService,
    private router: Router,
    private snackBar: MatSnackBar,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadProjects();

    this.isAdminOrGM$ = this.authService.user().pipe(
      map((user: any) => {
        if (!user?.roles) return false;
        const roles = Array.isArray(user.roles) ? user.roles : [user.roles];
        return roles.some((r: string) =>
          r.includes('ADMIN') || r.includes('GENERAL_MANAGER')
        );
      })
    );

    // Debounce search input to avoid filtering on every keystroke
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => this.applyFilters());
  }

  loadProjects(): void {
    this.isLoading = true;
    this.projectService.getAll(this.currentPage, this.pageSize).subscribe({
      next: (res) => {
        this.allProjects = res.content;
        this.totalElements = res.totalElements;
        this.buildManagerOptions();
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load projects', 'Close', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  // ── Build unique manager list from loaded projects ──
  private buildManagerOptions(): void {
    const names = this.allProjects
      .map(p => p.projectManagerName)
      .filter((name): name is string => !!name);
    this.managerOptions = [...new Set(names)].sort();
  }

  // ── Apply both search and manager filter ──
  applyFilters(): void {
    const keyword = this.searchKeyword.toLowerCase().trim();
    const manager = this.selectedManager;

    this.projects = this.allProjects.filter(p => {
      const matchesSearch =
        !keyword ||
        p.name?.toLowerCase().includes(keyword) ||
        p.code?.toLowerCase().includes(keyword) ||
        p.description?.toLowerCase().includes(keyword);

      const matchesManager =
        !manager || p.projectManagerName === manager;

      return matchesSearch && matchesManager;
    });
  }

  onSearchChange(value: string): void {
    this.searchKeyword = value;
    this.searchSubject.next(value);
  }

  onManagerFilterChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchKeyword = '';
    this.selectedManager = '';
    this.applyFilters();
  }

  get hasActiveFilters(): boolean {
    return !!this.searchKeyword || !!this.selectedManager;
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadProjects();
  }

  createProject(): void { this.router.navigate(['/projects/new']); }

  viewProject(project: Project): void { this.router.navigate(['/projects', project.id]); }

  editProject(project: Project): void {
    event?.stopPropagation();
    this.router.navigate(['/projects', project.id, 'edit']);
  }

  deleteProject(project: Project): void {
    event?.stopPropagation();
    if (!confirm(`Delete project "${project.name}"? This action cannot be undone.`)) return;
    this.projectService.delete(project.id).subscribe({
      next: () => {
        this.snackBar.open('Project deleted', 'Close', { duration: 3000 });
        this.loadProjects();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Failed to delete project', 'Close', { duration: 3000 });
      }
    });
  }

  countByStatus(status: string): number {
    return this.allProjects.filter(p => p.status === status).length;
  }

  getStatusLabel(status: string): string {
    const labels: any = {
      PLANNED: 'Planned', IN_PROGRESS: 'In Progress',
      ON_HOLD: 'On Hold', COMPLETED: 'Completed', CANCELLED: 'Cancelled'
    };
    return labels[status] || status;
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  isOverdue(project: Project): boolean {
    if (!project.endDate || project.status === 'COMPLETED' || project.status === 'CANCELLED') return false;
    return new Date(project.endDate) < new Date();
  }
}