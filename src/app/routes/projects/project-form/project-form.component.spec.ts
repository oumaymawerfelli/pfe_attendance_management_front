import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, throwError } from 'rxjs';

import { ProjectFormComponent } from './project-form.component';
import { ProjectService } from '../project.service';

// ── Shared test doubles ───────────────────────────────────────────────────────

const mockProject = {
  id: 1,
  name: 'Test Project',
  description: 'A description',
  status: 'IN_PROGRESS',
  startDate: '2026-01-01',
  endDate: '2026-01-16',
  projectManagerId: 42,
};

function buildProjectServiceSpy() {
  const spy = jasmine.createSpyObj<ProjectService>('ProjectService', [
    'getById', 'create', 'update',
  ]);
  spy.getById.and.returnValue(of(mockProject as any));
  spy.create.and.returnValue(of(mockProject as any));
  spy.update.and.returnValue(of(mockProject as any));
  return spy;
}

function buildModuleConfig(routeId: string | null, projectService: any, router: any, snackBar: any) {
  return {
    declarations: [ProjectFormComponent],
    imports: [HttpClientTestingModule, ReactiveFormsModule, RouterTestingModule, NoopAnimationsModule],
    schemas: [NO_ERRORS_SCHEMA],
    providers: [
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => routeId } } } },
      { provide: Router,         useValue: router },
      { provide: MatSnackBar,    useValue: snackBar },
      { provide: ProjectService, useValue: projectService },
    ],
  };
}

// ── CREATE MODE ───────────────────────────────────────────────────────────────

describe('ProjectFormComponent (create mode)', () => {
  let component: ProjectFormComponent;
  let fixture: ComponentFixture<ProjectFormComponent>;
  let httpMock: HttpTestingController;
  let projectServiceSpy: jasmine.SpyObj<ProjectService>;
  let mockRouter: { navigate: jasmine.Spy };
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    projectServiceSpy = buildProjectServiceSpy();
    mockRouter        = { navigate: jasmine.createSpy('navigate') };
    snackBarSpy       = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule(
      buildModuleConfig(null, projectServiceSpy, mockRouter, snackBarSpy)
    ).compileComponents();

    httpMock  = TestBed.inject(HttpTestingController);
    fixture   = TestBed.createComponent(ProjectFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Always flush the managers call triggered by ngOnInit
    httpMock.expectOne('/api/users?size=100').flush({ content: [] });
  });

  afterEach(() => { httpMock.verify(); fixture.destroy(); });

  // ── Creation ────────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should be in create mode', () => {
    expect(component.isEditMode).toBeFalse();
    expect(component.projectId).toBeUndefined();
  });

  // ── Form initialisation ─────────────────────────────────────────────────

  it('should initialise the form with default values', () => {
    expect(component.projectForm).toBeDefined();
    expect(component.projectForm.get('name')?.value).toBe('');
    expect(component.projectForm.get('status')?.value).toBe('PLANNED');
    expect(component.projectForm.get('projectManagerId')?.value).toBeNull();
  });

  it('should mark name invalid when empty', () => {
    component.projectForm.get('name')?.setValue('');
    expect(component.projectForm.get('name')?.invalid).toBeTrue();
  });

  it('should mark name invalid when shorter than 3 characters', () => {
    component.projectForm.get('name')?.setValue('AB');
    expect(component.projectForm.get('name')?.invalid).toBeTrue();
  });

  it('should mark name valid when it has 3 or more characters', () => {
    component.projectForm.get('name')?.setValue('ABC');
    expect(component.projectForm.get('name')?.valid).toBeTrue();
  });

  it('should require startDate', () => {
    component.projectForm.get('startDate')?.setValue('');
    expect(component.projectForm.get('startDate')?.invalid).toBeTrue();
  });

  // ── Date validator ──────────────────────────────────────────────────────

  it('should set dateInvalid when endDate is before startDate', () => {
    component.projectForm.patchValue({ startDate: '2026-06-01', endDate: '2026-01-01' });
    expect(component.projectForm.errors?.['dateInvalid']).toBeTrue();
  });

  it('should have no dateInvalid error when endDate is after startDate', () => {
    component.projectForm.patchValue({ startDate: '2026-01-01', endDate: '2026-06-01' });
    expect(component.projectForm.errors?.['dateInvalid']).toBeFalsy();
  });

  it('should have no dateInvalid error when endDate is empty', () => {
    component.projectForm.patchValue({ startDate: '2026-01-01', endDate: '' });
    expect(component.projectForm.errors?.['dateInvalid']).toBeFalsy();
  });

  // ── Managers loading ────────────────────────────────────────────────────

  it('should populate managers from API response', () => {
    // Managers already flushed in beforeEach with empty array;
    // call loadManagers() again with real data
    component.loadManagers();
    httpMock.expectOne('/api/users?size=100')
      .flush({ content: [{ id: 1, firstName: 'Jane', lastName: 'Smith' }] });
    expect(component.managers.length).toBe(1);
  });

  it('should set managers to empty array when content is missing', () => {
    component.loadManagers();
    httpMock.expectOne('/api/users?size=100').flush({});
    expect(component.managers).toEqual([]);
  });

  // ── Submit ──────────────────────────────────────────────────────────────

  it('should not submit when form is invalid', () => {
    component.projectForm.get('name')?.setValue('');
    component.onSubmit();
    expect(projectServiceSpy.create).not.toHaveBeenCalled();
  });

  it('should call create and navigate on valid submit', () => {
    component.projectForm.patchValue({ name: 'New Project', status: 'PLANNED', startDate: '2026-01-01' });
    component.onSubmit();
    expect(projectServiceSpy.create).toHaveBeenCalled();
    expect(snackBarSpy.open).toHaveBeenCalledWith('Project created successfully!', 'Close', { duration: 3000 });
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/projects']);
  });

  it('should set errorMessage on submit failure', () => {
    projectServiceSpy.create.and.returnValue(throwError(() => ({ error: { message: 'Server error' } })));
    component.projectForm.patchValue({ name: 'New Project', status: 'PLANNED', startDate: '2026-01-01' });
    component.onSubmit();
    expect(component.errorMessage).toBe('Server error');
    expect(component.isSubmitting).toBeFalse();
  });

  // ── Navigation ──────────────────────────────────────────────────────────

  it('should navigate to /projects on goBack()', () => {
    component.goBack();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/projects']);
  });

  // ── Preview getters ─────────────────────────────────────────────────────

  it('should return placeholder when name is empty', () => {
    component.projectForm.get('name')?.setValue('');
    expect(component.previewName).toBe('Project Title');
  });

  it('should return trimmed name', () => {
    component.projectForm.get('name')?.setValue('  My App  ');
    expect(component.previewName).toBe('My App');
  });

  it('should return current status', () => {
    component.projectForm.get('status')?.setValue('COMPLETED');
    expect(component.previewStatus).toBe('COMPLETED');
  });

  it('should return "Unassigned" when no manager selected', () => {
    component.projectForm.get('projectManagerId')?.setValue(null);
    expect(component.previewManager).toBe('Unassigned');
    expect(component.previewManagerInitials).toBe('?');
  });

  it('should return manager name and initials when selected', () => {
    component.managers = [{ id: 7, firstName: 'Jane', lastName: 'Smith' }];
    component.projectForm.get('projectManagerId')?.setValue(7);
    expect(component.previewManager).toBe('Jane Smith');
    expect(component.previewManagerInitials).toBe('JS');
  });

  it('should return placeholder when startDate is empty', () => {
    component.projectForm.get('startDate')?.setValue('');
    expect(component.previewStartDate).toBe('Start date');
  });

  it('should return placeholder when endDate is empty', () => {
    component.projectForm.get('endDate')?.setValue('');
    expect(component.previewEndDate).toBe('End date');
  });

  // ── getStatusLabel ──────────────────────────────────────────────────────

  it('should return correct status labels', () => {
    expect(component.getStatusLabel('PLANNED')).toBe('Planned');
    expect(component.getStatusLabel('IN_PROGRESS')).toBe('In Progress');
    expect(component.getStatusLabel('ON_HOLD')).toBe('On Hold');
    expect(component.getStatusLabel('COMPLETED')).toBe('Completed');
    expect(component.getStatusLabel('CANCELLED')).toBe('Cancelled');
    expect(component.getStatusLabel('UNKNOWN')).toBe('UNKNOWN');
  });
});

// ── EDIT MODE ─────────────────────────────────────────────────────────────────

describe('ProjectFormComponent (edit mode)', () => {
  let component: ProjectFormComponent;
  let fixture: ComponentFixture<ProjectFormComponent>;
  let httpMock: HttpTestingController;
  let projectServiceSpy: jasmine.SpyObj<ProjectService>;
  let mockRouter: { navigate: jasmine.Spy };
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    projectServiceSpy = buildProjectServiceSpy();
    mockRouter        = { navigate: jasmine.createSpy('navigate') };
    snackBarSpy       = jasmine.createSpyObj('MatSnackBar', ['open']);

    // Reset so we can reconfigure with route id = '1'
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule(
      buildModuleConfig('1', projectServiceSpy, mockRouter, snackBarSpy)
    ).compileComponents();

    httpMock  = TestBed.inject(HttpTestingController);
    fixture   = TestBed.createComponent(ProjectFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    httpMock.expectOne('/api/users?size=100').flush({ content: [] });
  });

  afterEach(() => { httpMock.verify(); fixture.destroy(); });

  it('should be in edit mode', () => {
    expect(component.isEditMode).toBeTrue();
    expect(component.projectId).toBe(1);
  });

  it('should call getById with the route id', () => {
    expect(projectServiceSpy.getById).toHaveBeenCalledWith(1);
  });

  it('should patch the form with loaded project data', () => {
    expect(component.projectForm.get('name')?.value).toBe('Test Project');
    expect(component.projectForm.get('status')?.value).toBe('IN_PROGRESS');
  });

  it('should call update and navigate on submit', () => {
    component.onSubmit();
    expect(projectServiceSpy.update).toHaveBeenCalledWith(1, jasmine.any(Object));
    expect(snackBarSpy.open).toHaveBeenCalledWith('Project updated successfully!', 'Close', { duration: 3000 });
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/projects']);
  });

  it('should redirect when project load fails', () => {
    projectServiceSpy.getById.and.returnValue(throwError(() => new Error('not found')));
    component.loadProject(99);
    expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to load project', 'Close', { duration: 3000 });
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/projects']);
  });
});