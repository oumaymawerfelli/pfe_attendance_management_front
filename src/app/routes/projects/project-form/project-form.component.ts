import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { ProjectService } from '../project.service';

@Component({
  selector: 'app-project-form',
templateUrl: './project-form.component.html',
   styleUrls: ['./project-form.component.scss']
 
   
  
})
export class ProjectFormComponent implements OnInit {
  projectForm!: FormGroup;
  isEditMode = false;
  isSubmitting = false;
  errorMessage = '';
  projectId?: number;
  managers: any[] = [];

  constructor(
    private fb: FormBuilder,
    private projectService: ProjectService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadManagers();

    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isEditMode = true;
      this.projectId = +id;
      this.loadProject(this.projectId);
    }
  }

  initForm(): void {
    this.projectForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      status: ['PLANNED', Validators.required],
      startDate: ['', Validators.required],
      endDate: [''],
      projectManagerId: [null]
    }, { validators: this.dateValidator });
  }

  dateValidator(form: any) {
    const start = form.get('startDate')?.value;
    const end = form.get('endDate')?.value;
    if (start && end && new Date(end) < new Date(start)) {
      return { dateInvalid: true };
    }
    return null;
  }

  loadManagers(): void {
    this.http.get<any[]>('/api/users?size=100').subscribe({
      next: (res: any) => {
        this.managers = res.content || [];
      },
      error: () => {}
    });
  }

  loadProject(id: number): void {
    this.projectService.getById(id).subscribe({
      next: (project) => {
        this.projectForm.patchValue({
          name: project.name,
          description: project.description,
          status: project.status,
          startDate: project.startDate,
          endDate: project.endDate
        });
      },
      error: () => {
        this.snackBar.open('Failed to load project', 'Close', { duration: 3000 });
        this.router.navigate(['/projects']);
      }
    });
  }

  onSubmit(): void {
    if (this.projectForm.invalid) return;

    this.isSubmitting = true;
    this.errorMessage = '';

    const formValue = this.projectForm.value;
    const payload = {
      ...formValue,
      startDate: formValue.startDate ? new Date(formValue.startDate).toISOString().split('T')[0] : null,
      endDate: formValue.endDate ? new Date(formValue.endDate).toISOString().split('T')[0] : null,
    };

    const request = this.isEditMode
      ? this.projectService.update(this.projectId!, payload)
      : this.projectService.create(payload);

    request.subscribe({
      next: (project) => {
        this.isSubmitting = false;
        this.snackBar.open(
          `Project ${this.isEditMode ? 'updated' : 'created'} successfully!`,
          'Close', { duration: 3000 }
        );
        this.router.navigate(['/projects', project.id]);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.message || 'Failed to save project';
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/projects']);
  }
}