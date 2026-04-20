import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

import { AllEmployeesAttendanceComponent } from './all-employees-attendance.component';
import { AttendanceService } from '../../../services/attendance.service';
import { AuthService } from '../../../../../core/authentication/auth.service';

describe('AllEmployeesAttendanceComponent', () => {
  let component: AllEmployeesAttendanceComponent;
  let fixture: ComponentFixture<AllEmployeesAttendanceComponent>;

  const mockAttendanceService = {
    getAllAttendance: jasmine.createSpy('getAllAttendance').and.returnValue(of([])),
    getTeamAttendance: jasmine.createSpy('getTeamAttendance').and.returnValue(of([])),
  };

  const mockAuthService = {
    user: jasmine.createSpy('user').and.returnValue(
      of({
        roles: ['ROLE_ADMIN'],
      })
    ),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AllEmployeesAttendanceComponent],
      schemas: [NO_ERRORS_SCHEMA], // 👈 supprime les erreurs mat-*
      providers: [
        { provide: AttendanceService, useValue: mockAttendanceService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AllEmployeesAttendanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load attendance on init', () => {
    expect(mockAttendanceService.getAllAttendance).toHaveBeenCalled();
    expect(component.loading).toBeFalse();
  });

  it('should set isGMAdmin to true for ADMIN role', () => {
    expect(component.isGMAdmin).toBeTrue();
    expect(component.isPM).toBeFalse();
  });
});
