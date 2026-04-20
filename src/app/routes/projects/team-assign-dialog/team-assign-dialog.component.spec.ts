import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

import { TeamAssignDialogComponent } from './team-assign-dialog.component';
import { AuthService } from '@core/authentication';

describe('TeamAssignDialogComponent', () => {
  let component: TeamAssignDialogComponent;
  let fixture: ComponentFixture<TeamAssignDialogComponent>;
  let httpMock: HttpTestingController;

  const mockDialogRef = { close: jasmine.createSpy('close') };
  const mockSnackBar = { open: jasmine.createSpy('open') };
  const mockAuthService = {
    user: jasmine.createSpy('user').and.returnValue(of({ id: 42 })),
  };
  const mockDialogData = {
    projectId: 1,
    projectName: 'Test Project',
    currentTeamIds: [10, 20],
  };

  const mockEmployees = [
    { id: 1, firstName: 'Alice', lastName: 'Smith', email: 'alice@test.com' },
    { id: 2, firstName: 'Bob', lastName: 'Jones', email: 'bob@test.com' },
    { id: 10, firstName: 'Already', lastName: 'InTeam', email: 'team@test.com' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TeamAssignDialogComponent],
      imports: [HttpClientTestingModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData },
        { provide: MatSnackBar, useValue: mockSnackBar },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamAssignDialogComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    // Flush the employees HTTP call triggered by ngOnInit
    const req = httpMock.expectOne('/api/users?size=200');
    req.flush({ content: mockEmployees });
  });

  afterEach(() => httpMock.verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load employees and exclude current team members', () => {
    expect(component.employees.length).toBe(2); // id 10 excluded
    expect(component.employees.find(e => e.id === 10)).toBeUndefined();
  });

  it('should set current user id from auth service', () => {
    expect(component.currentUserId).toBe(42);
  });

  it('should filter employees by search text', () => {
    component.searchText = 'alice';
    component.filterEmployees();
    expect(component.filtered.length).toBe(1);
    expect(component.filtered[0].firstName).toBe('Alice');
  });

  it('should select and deselect an employee', () => {
    const emp = component.employees[0];
    component.select(emp);
    expect(component.selected).toBe(emp);

    component.select(emp); // toggle off
    expect(component.selected).toBeNull();
  });

  it('should not assign if nothing is selected', () => {
    component.selected = null;
    component.assign();
    expect(component.isSubmitting).toBeFalse();
  });

  it('should call assign API and close dialog on success', () => {
    component.selected = component.employees[0];
    component.assign();

    const req = httpMock.expectOne('/api/team-assignments');
    expect(req.request.method).toBe('POST');
    req.flush({ id: 99 });

    expect(mockDialogRef.close).toHaveBeenCalledWith({
      assigned: true,
      employee: component.employees[0],
      assignment: { id: 99 },
    });
  });

  it('should close dialog on cancel', () => {
    component.cancel();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });

  it('should return correct initials', () => {
    expect(component.getInitials('Alice Smith')).toBe('AS');
  });

  it('should format role correctly', () => {
    expect(component.formatRole('ROLE_PROJECT_MANAGER')).toBe('PROJECT MANAGER');
    expect(component.formatRole(undefined)).toBe('EMPLOYEE');
  });
});
