import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ProjectListComponent } from './project-list.component';
import { ProjectService } from '../project.service';
import { AuthService } from '@core/authentication';

describe('ProjectListComponent', () => {
  let component: ProjectListComponent;
  let fixture: ComponentFixture<ProjectListComponent>;

  const mockProjects = [
    {
      id: 1,
      name: 'Alpha',
      code: 'A1',
      status: 'IN_PROGRESS',
      projectManagerName: 'Alice',
      endDate: '2025-12-31',
    },
    {
      id: 2,
      name: 'Beta',
      code: 'B2',
      status: 'PLANNED',
      projectManagerName: 'Bob',
      endDate: '2024-01-01',
    },
    {
      id: 3,
      name: 'Gamma',
      code: 'G3',
      status: 'COMPLETED',
      projectManagerName: 'Alice',
      endDate: '2023-01-01',
    },
  ];

  const mockProjectService = {
    getAll: jasmine.createSpy('getAll').and.returnValue(
      of({
        content: mockProjects,
        totalElements: 3,
      })
    ),
    delete: jasmine.createSpy('delete').and.returnValue(of({})),
  };

  const mockAuthService = {
    user: jasmine.createSpy('user').and.returnValue(of({ roles: ['ROLE_ADMIN'] })),
  };

  const mockRouter = {
    navigate: jasmine.createSpy('navigate'),
  };

  const mockSnackBar = { open: jasmine.createSpy('open') };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProjectListComponent],
      imports: [HttpClientTestingModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: ProjectService, useValue: mockProjectService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: MatSnackBar, useValue: mockSnackBar },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load projects on init', () => {
    expect(mockProjectService.getAll).toHaveBeenCalled();
    expect(component.allProjects.length).toBe(3);
    expect(component.totalElements).toBe(3);
    expect(component.isLoading).toBeFalse();
  });

  it('should build manager options from projects', () => {
    expect(component.managerOptions).toContain('Alice');
    expect(component.managerOptions).toContain('Bob');
  });

  it('should filter projects by keyword', () => {
    component.searchKeyword = 'alpha';
    component.applyFilters();
    expect(component.projects.length).toBe(1);
    expect(component.projects[0].name).toBe('Alpha');
  });

  it('should filter by manager', () => {
    component.selectedManager = 'Alice';
    component.applyFilters();
    expect(component.projects.every(p => p.projectManagerName === 'Alice')).toBeTrue();
  });

  it('should clear filters', () => {
    component.searchKeyword = 'alpha';
    component.selectedManager = 'Alice';
    component.clearFilters();
    expect(component.searchKeyword).toBe('');
    expect(component.selectedManager).toBe('');
    expect(component.projects.length).toBe(3);
  });

  it('should count by status correctly', () => {
    expect(component.countByStatus('IN_PROGRESS')).toBe(1);
    expect(component.countByStatus('COMPLETED')).toBe(1);
  });

  it('should return correct status label', () => {
    expect(component.getStatusLabel('IN_PROGRESS')).toBe('In Progress');
    expect(component.getStatusLabel('PLANNED')).toBe('Planned');
  });

  it('should return correct initials', () => {
    expect(component.getInitials('Alice Smith')).toBe('AS');
  });

  it('should detect overdue project', () => {
    expect(component.isOverdue(mockProjects[1] as any)).toBeTrue();
  });

  it('should not be overdue if completed', () => {
    expect(component.isOverdue(mockProjects[2] as any)).toBeFalse();
  });

  it('should navigate to new project on create', () => {
    component.createProject();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/projects/new']);
  });

  it('should navigate to project detail on view', () => {
    component.viewProject(mockProjects[0] as any);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/projects', 1]);
  });
});
