import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ProjectDetailComponent } from './project-detail.component';
import { ProjectService } from '../project.service';
import { AuthService } from '@core/authentication';

describe('ProjectDetailComponent', () => {
  let component: ProjectDetailComponent;
  let fixture: ComponentFixture<ProjectDetailComponent>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;

  const mockProject = {
    id: 1,
    name: 'Test Project',
    status: 'IN_PROGRESS',
    startDate: '2026-01-01',
    endDate: '2026-01-16',
    createdAt: '2025-12-01T00:00:00Z',
    projectManagerName: 'Jane Smith',
  };

  const mockTeamMembers = [
    { id: 1, firstName: 'John', lastName: 'Doe', assignmentId: 10 },
  ];

  const mockStatusHistory = [
    { toStatus: 'IN_PROGRESS', changedAt: '2026-01-02T00:00:00Z', changedBy: 'Jane Smith' },
  ];

  let mockProjectService: jasmine.SpyObj<ProjectService>;
  let mockAuthService: { user: jasmine.Spy };
  let mockRouter: { navigate: jasmine.Spy };

  beforeEach(async () => {
    mockProjectService = jasmine.createSpyObj('ProjectService', [
      'getById', 'getTeamMembers', 'getStatusHistory',
      'updateStatus', 'removeTeamMember', 'delete',
    ]);
    mockProjectService.getById.and.returnValue(of(mockProject as any));
    mockProjectService.getTeamMembers.and.returnValue(of(mockTeamMembers as any));
    mockProjectService.getStatusHistory.and.returnValue(of(mockStatusHistory as any));
    mockProjectService.updateStatus.and.returnValue(of(mockProject as any));
 mockProjectService.removeTeamMember.and.returnValue(of(undefined as void));
mockProjectService.delete.and.returnValue(of(undefined as void));

    mockAuthService = {
      user: jasmine.createSpy('user').and.returnValue(of({ roles: ['ROLE_ADMIN'] })),
    };

    mockRouter = { navigate: jasmine.createSpy('navigate') };

    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    dialogSpy   = jasmine.createSpyObj('MatDialog', ['open']);
    dialogSpy.open.and.returnValue({ afterClosed: () => of(false) } as any);

    await TestBed.configureTestingModule({
      declarations: [ProjectDetailComponent],
      imports: [HttpClientTestingModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '1' } } },
        },
        { provide: Router,       useValue: mockRouter },
        { provide: MatSnackBar,  useValue: snackBarSpy },
        { provide: MatDialog,    useValue: dialogSpy },
        { provide: ProjectService, useValue: mockProjectService },
        { provide: AuthService,  useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(ProjectDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  // ── Creation ──────────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── ngOnInit data loading ─────────────────────────────────────────────────

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

  it('should load status history on init', () => {
    expect(mockProjectService.getStatusHistory).toHaveBeenCalledWith(1);
    expect(component.statusHistory.length).toBe(1);
    expect(component.isLoadingHistory).toBeFalse();
  });

  // ── Role resolution ───────────────────────────────────────────────────────

  it('should set isAdminOrGM and canManageTeam for ADMIN role', () => {
    expect(component.isAdminOrGM).toBeTrue();
    expect(component.canManageTeam).toBeTrue();
  });

  it('should not grant admin rights for a basic role', () => {
    mockAuthService.user.and.returnValue(of({ roles: ['ROLE_EMPLOYEE'] }));
    component.ngOnInit();
    expect(component.isAdminOrGM).toBeFalse();
  });

  it('should grant canManageTeam for PROJECT_MANAGER role', () => {
    mockAuthService.user.and.returnValue(of({ roles: ['ROLE_PROJECT_MANAGER'] }));
    component.ngOnInit();
    expect(component.canManageTeam).toBeTrue();
    expect(component.isAdminOrGM).toBeFalse();
  });

  // ── Computed getters ──────────────────────────────────────────────────────

  it('should calculate project duration in days', () => {
    // mockProject: 2026-01-01 → 2026-01-16 = 15 days
    expect(component.projectDuration).toBe('15 Days');
  });

  it('should return "—" for project duration when dates are missing', () => {
    component.project = { ...mockProject, startDate: undefined } as any;
    expect(component.projectDuration).toBe('—');
  });

  it('should build recentActivity from creation and history', () => {
    const activity = component.recentActivity;
    expect(activity.length).toBeGreaterThan(0);
    expect(activity[0].title).toBe('Project created');
  });

  // ── Template helpers ──────────────────────────────────────────────────────

  it('should return correct status label', () => {
    expect(component.getStatusLabel('IN_PROGRESS')).toBe('In Progress');
    expect(component.getStatusLabel('PLANNED')).toBe('Planned');
    expect(component.getStatusLabel('ON_HOLD')).toBe('On Hold');
    expect(component.getStatusLabel('COMPLETED')).toBe('Completed');
    expect(component.getStatusLabel('CANCELLED')).toBe('Cancelled');
    expect(component.getStatusLabel('UNKNOWN')).toBe('UNKNOWN'); // fallback
  });

  it('should return correct initials', () => {
    expect(component.getInitials('John Doe')).toBe('JD');
    expect(component.getInitials('Alice')).toBe('A');
    expect(component.getInitials('Mary Jane Watson')).toBe('MJ');
  });

  // ── isOverdue ─────────────────────────────────────────────────────────────

  it('should detect an overdue project', () => {
    component.project = { ...mockProject, endDate: '2000-01-01', status: 'IN_PROGRESS' } as any;
    expect(component.isOverdue(component.project)).toBeTrue();
  });

  it('should not be overdue when status is COMPLETED', () => {
    component.project = { ...mockProject, endDate: '2000-01-01', status: 'COMPLETED' } as any;
    expect(component.isOverdue(component.project)).toBeFalse();
  });

  it('should not be overdue when status is CANCELLED', () => {
    component.project = { ...mockProject, endDate: '2000-01-01', status: 'CANCELLED' } as any;
    expect(component.isOverdue(component.project)).toBeFalse();
  });

  it('should return false for isOverdue when project is null', () => {
    expect(component.isOverdue(null)).toBeFalse();
  });

  // ── Navigation ────────────────────────────────────────────────────────────

  it('should navigate back to /projects', () => {
    component.goBack();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/projects']);
  });

  it('should navigate to edit page', () => {
    component.project = mockProject as any;
    component.editProject();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/projects', 1, 'edit']);
  });

  // ── updateStatus ──────────────────────────────────────────────────────────

  it('should call updateStatus and show snackbar on success', () => {
    dialogSpy.open.and.returnValue({ afterClosed: () => of('some reason') } as any);
    component.project = mockProject as any;

    component.updateStatus('ON_HOLD');

    expect(mockProjectService.updateStatus).toHaveBeenCalledWith(1, 'ON_HOLD', 'some reason');
    expect(snackBarSpy.open).toHaveBeenCalledWith('Status updated', 'Close', { duration: 2000 });
  });

  it('should not call updateStatus when dialog is cancelled', () => {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(undefined) } as any);
    mockProjectService.updateStatus.calls.reset();
    component.project = mockProject as any;

    component.updateStatus('ON_HOLD');

    expect(mockProjectService.updateStatus).not.toHaveBeenCalled();
  });

  // ── removeMember ──────────────────────────────────────────────────────────

  it('should remove a team member when confirmed', () => {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(true) } as any);
    component.project = mockProject as any;

    component.removeMember(mockTeamMembers[0] as any);

    expect(mockProjectService.removeTeamMember).toHaveBeenCalledWith(10); // assignmentId
    expect(snackBarSpy.open).toHaveBeenCalledWith('John Doe removed', 'Close', { duration: 3000 });
  });

  it('should not remove a team member when cancelled', () => {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(false) } as any);
    mockProjectService.removeTeamMember.calls.reset();
    component.project = mockProject as any;

    component.removeMember(mockTeamMembers[0] as any);

    expect(mockProjectService.removeTeamMember).not.toHaveBeenCalled();
  });

  // ── deleteProject ─────────────────────────────────────────────────────────

  it('should delete project and navigate away when confirmed', () => {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(true) } as any);
    component.project = mockProject as any;

    component.deleteProject();

    expect(mockProjectService.delete).toHaveBeenCalledWith(1);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/projects']);
  });

  it('should not delete project when dialog is cancelled', () => {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(false) } as any);
    mockProjectService.delete.calls.reset();
    component.project = mockProject as any;

    component.deleteProject();

    expect(mockProjectService.delete).not.toHaveBeenCalled();
  });

  // ── Error handling ────────────────────────────────────────────────────────

  it('should show snackbar and redirect when project load fails', () => {
    mockProjectService.getById.and.returnValue(throwError(() => new Error('not found')));
    component.loadProject(99);

    expect(snackBarSpy.open).toHaveBeenCalledWith('Project not found', 'Close', { duration: 3000 });
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/projects']);
  });

  it('should show snackbar when team load fails', () => {
    mockProjectService.getTeamMembers.and.returnValue(throwError(() => new Error('fail')));
    component.loadTeam(1);

    expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to load team', 'Close', { duration: 3000 });
  });
});