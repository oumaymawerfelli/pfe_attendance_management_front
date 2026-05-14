import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { ProjectService } from '../project.service';

@Component({
  selector: 'app-project-form',
  templateUrl: './project-form.component.html',
  styleUrls: ['./project-form.component.scss'],
})
export class ProjectFormComponent implements OnInit {

  projectForm!: FormGroup;
  isEditMode   = false;
  isSubmitting = false;
  errorMessage = '';
  projectId?: number;
  managers: any[] = [];

  readonly statuses = [
    { value: 'PLANNED',     label: 'Planned'     },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'ON_HOLD',     label: 'On Hold'     },
    { value: 'COMPLETED',   label: 'Completed'   },
    { value: 'CANCELLED',   label: 'Cancelled'   },
  ];

  constructor(
    private fb:             FormBuilder,
    private projectService: ProjectService,
    private route:          ActivatedRoute,
    private router:         Router,
    private snackBar:       MatSnackBar,
    private http:           HttpClient,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadManagers();

    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isEditMode = true;
      this.projectId  = +id;
      this.loadProject(this.projectId);
    }
  }

  // ── Form setup ────────────────────────────────────────────────────────────

  initForm(): void {
    this.projectForm = this.fb.group(
      {
        name:             ['', [Validators.required, Validators.minLength(3)]],
        description:      [''],
        status:           ['PLANNED', Validators.required],
        startDate:        ['', Validators.required],
        endDate:          [''],
        projectManagerId: [null],
      },
      { validators: this.dateValidator }
    );
  }

  private dateValidator(form: FormGroup) {
    const start = form.get('startDate')?.value;
    const end   = form.get('endDate')?.value;
    if (start && end && new Date(end) < new Date(start)) {
      return { dateInvalid: true };
    }
    return null;
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  loadManagers(): void {
    this.http.get<any>('/api/users?size=100').subscribe({
      next: (res: any) => { this.managers = res.content || []; },
      error: () => {},
    });
  }

  loadProject(id: number): void {
    this.projectService.getById(id).subscribe({
      next: project => {
        this.projectForm.patchValue({
          name:             project.name,
          description:      project.description,
          status:           project.status,
          startDate:        project.startDate,
          endDate:          project.endDate,
          projectManagerId: (project as any).projectManagerId ?? null,
        });
      },
      error: () => {
        this.snackBar.open('Failed to load project', 'Close', { duration: 3000 });
        this.router.navigate(['/projects']);
      },
    });
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  onSubmit(): void {
    if (this.projectForm.invalid) return;

    this.isSubmitting = true;
    this.errorMessage = '';

    const formValue = this.projectForm.value;
    const payload = {
      ...formValue,
      startDate: formValue.startDate
        ? new Date(formValue.startDate).toISOString().split('T')[0]
        : null,
      endDate: formValue.endDate
        ? new Date(formValue.endDate).toISOString().split('T')[0]
        : null,
    };

    const request$ = this.isEditMode
      ? this.projectService.update(this.projectId!, payload)
      : this.projectService.create(payload);

    request$.subscribe({
      next: () => {
        this.isSubmitting = false;
        this.snackBar.open(
          `Project ${this.isEditMode ? 'updated' : 'created'} successfully!`,
          'Close',
          { duration: 3000 }
        );
        this.router.navigate(['/projects']);  // ← Router, not window.location.href
      },
      error: err => {
        this.isSubmitting = false;
        if (Array.isArray(err)) {
          this.router.navigate(['/projects']);
          return;
        }
        this.errorMessage = err.error?.message || 'Failed to save project';
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/projects']);
  }

  // ── Live Preview getters ──────────────────────────────────────────────────

  get previewName(): string {
    return this.projectForm.get('name')?.value?.trim() || 'Project Title';
  }

  get previewDescription(): string {
    return this.projectForm.get('description')?.value?.trim()
      || 'Project description will appear here...';
  }

  get previewStatus(): string {
    return this.projectForm.get('status')?.value || 'PLANNED';
  }

  get previewManager(): string {
    const id = this.projectForm.get('projectManagerId')?.value;
    if (!id) return 'Unassigned';
    const m = this.managers.find(m => m.id === id);
    return m ? `${m.firstName} ${m.lastName}` : 'Unassigned';
  }

  get previewManagerInitials(): string {
    const name = this.previewManager;
    if (name === 'Unassigned') return '?';
    return name.split(' ').filter(Boolean).slice(0, 2)
      .map((n: string) => n[0].toUpperCase()).join('');
  }

  get previewStartDate(): string {
    const d = this.projectForm.get('startDate')?.value;
    if (!d) return 'Start date';
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  }

  get previewEndDate(): string {
    const d = this.projectForm.get('endDate')?.value;
    if (!d) return 'End date';
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
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
}