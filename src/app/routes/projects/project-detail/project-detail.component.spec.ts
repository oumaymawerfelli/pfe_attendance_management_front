import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ProjectDetailComponent } from './project-detail.component';
import { ProjectService } from '../project.service';
import { AuthService } from '@core/authentication';

describe('ProjectDetailComponent', () => {
  let component: ProjectDetailComponent;
  let fixture: ComponentFixture<ProjectDetailComponent>;

  const mockProject = {
    id: 1,
    name: 'Test Project',
    status: 'IN_PROGRESS',
    endDate: '2025-12-31',
  };

  const mockTeamMembers = [{ id: 1, firstName: 'John', lastName: 'Doe', assignmentId: 10 }];

  const mockProjectService = {
    getById: jasmine.createSpy('getById').and.returnValue(of(mockProject)),
    getTeamMembers: jasmine.createSpy('getTeamMembers').and.returnValue(of(mockTeamMembers)),
    updateStatus: jasmine.createSpy('updateStatus').and.returnValue(of(mockProject)),
    removeTeamMember: jasmine.createSpy('removeTeamMember').and.returnValue(of({})),
    delete: jasmine.createSpy('delete').and.returnValue(of({})),
  };

  const mockAuthService = {
    user: jasmine.createSpy('user').and.returnValue(
      of({
        roles: ['ROLE_ADMIN'],
      })
    ),
  };

  const mockRouter = {
    navigate: jasmine.createSpy('navigate'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProjectDetailComponent],
      imports: [HttpClientTestingModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => '1', // matches component's paramMap.get('id')
              },
            },
          },
        },
        { provide: Router, useValue: mockRouter },
        { provide: MatSnackBar, useValue: { open: jasmine.createSpy('open') } },
        {
          provide: MatDialog,
          useValue: {
            open: jasmine.createSpy('open').and.returnValue({ afterClosed: () => of(false) }),
          },
        },
        { provide: ProjectService, useValue: mockProjectService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // triggers ngOnInit
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load project on init', () => {
    expect(mockProjectService.getById).toHaveBeenCalledWith(1);
    expect(component.project).toEqual(mockProject as any);
    expect(component.isLoading).toBeFalse();
  });

  it('should load team members on init', () => {
    expect(mockProjectService.getTeamMembers).toHaveBeenCalledWith(1);
    expect(component.teamMembers.length).toBe(1);
    expect(component.isLoadingTeam).toBeFalse();
  });

  it('should return correct status label', () => {
    expect(component.getStatusLabel('IN_PROGRESS')).toBe('In Progress');
    expect(component.getStatusLabel('PLANNED')).toBe('Planned');
    expect(component.getStatusLabel('COMPLETED')).toBe('Completed');
  });

  it('should return correct initials', () => {
    expect(component.getInitials('John Doe')).toBe('JD');
    expect(component.getInitials('Alice')).toBe('A'); //  corriger l'expectation
  });

  it('should detect overdue project', () => {
    component.project = { ...mockProject, endDate: '2000-01-01', status: 'IN_PROGRESS' } as any;
    expect(component.isOverdue()).toBeTrue();
  });

  it('should not be overdue if completed', () => {
    component.project = { ...mockProject, endDate: '2000-01-01', status: 'COMPLETED' } as any;
    expect(component.isOverdue()).toBeFalse();
  });

  it('should navigate back to /projects', () => {
    component.goBack();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/projects']);
  });
});
