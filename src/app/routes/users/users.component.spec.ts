import {
  ComponentFixture, TestBed, fakeAsync, tick,
} from '@angular/core/testing';
import { NO_ERRORS_SCHEMA }  from '@angular/core';
import { Router }            from '@angular/router';
import { MatSnackBar }       from '@angular/material/snack-bar';
import { HttpClient }        from '@angular/common/http';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { PageEvent }         from '@angular/material/paginator';

import { UsersComponent }                        from './users.component';
import { UsersService, UserDTO, UserStats, PageResponse } from './user.service';
import { AuthService }                           from '@core/authentication';
import { TranslateModule }                       from '@ngx-translate/core';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeUserDTO(overrides: Partial<UserDTO> = {}): UserDTO {
  return {
    id:                  1,
    firstName:           'Alice',
    lastName:            'Smith',
    email:               'alice@example.com',
    roles:               ['ROLE_EMPLOYEE'],
    department:          'IT',
    active:              true,
    enabled:             true,
    accountNonLocked:    true,
    registrationPending: false,
    ...overrides,
  } as UserDTO;
}

function makePageResponse(users: UserDTO[] = [makeUserDTO()]): PageResponse<UserDTO> {
  return { content: users, totalElements: users.length } as PageResponse<UserDTO>;
}

const MOCK_STATS: UserStats = { active: 5, disabled: 1, pending: 2, locked: 0 };

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('UsersComponent', () => {
  let component:   UsersComponent;
  let fixture:     ComponentFixture<UsersComponent>;
  let usersSpy:    jasmine.SpyObj<UsersService>;
  let authSpy:     jasmine.SpyObj<AuthService>;
  let routerSpy:   jasmine.SpyObj<Router>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let user$:       BehaviorSubject<any>;

  function setupAuth(user: any) {
    user$ = new BehaviorSubject<any>(user);
    authSpy.user.and.returnValue(user$.asObservable());
  }

  beforeEach(async () => {
    usersSpy    = jasmine.createSpyObj('UsersService', [
      'getUsers', 'getStats',
      'approveUser', 'rejectUser', 'disableUser', 'enableUser', 'resetPassword',
    ]);
    authSpy     = jasmine.createSpyObj('AuthService', ['user']);
    routerSpy   = jasmine.createSpyObj('Router',      ['navigate']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    // Healthy defaults
    usersSpy.getUsers.and.returnValue(of(makePageResponse()));
    usersSpy.getStats.and.returnValue(of(MOCK_STATS));
    setupAuth({ roles: ['ROLE_EMPLOYEE'], firstName: 'Alice' });

    await TestBed.configureTestingModule({
      imports:      [TranslateModule.forRoot()],
      declarations: [UsersComponent],
      schemas:      [NO_ERRORS_SCHEMA],
      providers: [
        { provide: UsersService, useValue: usersSpy    },
        { provide: AuthService,  useValue: authSpy     },
        { provide: Router,       useValue: routerSpy   },
        { provide: MatSnackBar,  useValue: snackBarSpy  },
        { provide: HttpClient,   useValue: {}           },
      ],
    }).compileComponents();

    TestBed.overrideTemplate(UsersComponent, '');
    fixture   = TestBed.createComponent(UsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => { if (fixture) fixture.destroy(); });

  // ── Creation ──────────────────────────────────────────────────────────────

  describe('creation', () => {
    it('should create', () => expect(component).toBeTruthy());

    it('should start with isLoading = false after init', () => {
      expect(component.isLoading).toBeFalse();
    });

    it('should expose department list', () => {
      expect(component.departments).toContain('IT');
    });

    it('should expose role list', () => {
      expect(component.availableRoles).toContain('Admin');
    });
  });

  // ── ngOnInit — auth routing ───────────────────────────────────────────────

  describe('ngOnInit — auth', () => {
    it('should navigate to login when auth emits empty object', () => {
      setupAuth({});
      component.ngOnInit();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('should navigate to login when auth errors', () => {
      authSpy.user.and.returnValue(throwError(() => new Error('auth error')));
      component.ngOnInit();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('should load stats on successful auth', () => {
      expect(usersSpy.getStats).toHaveBeenCalled();
    });

    it('should load users on successful auth', () => {
      expect(usersSpy.getUsers).toHaveBeenCalled();
    });
  });

  // ── checkPermissions ──────────────────────────────────────────────────────

  describe('checkPermissions()', () => {
    it('should grant canToggleStatus for ADMIN role', () => {
      setupAuth({ roles: ['ROLE_ADMIN'] });
      component.ngOnInit();
      expect(component.canToggleStatus).toBeTrue();
    });

    it('should grant canToggleStatus for GENERAL_MANAGER role', () => {
      setupAuth({ roles: ['ROLE_GENERAL_MANAGER'] });
      component.ngOnInit();
      expect(component.canToggleStatus).toBeTrue();
    });

    it('should deny canToggleStatus for EMPLOYEE role', () => {
      expect(component.canToggleStatus).toBeFalse();
    });

    it('should deny canToggleStatus when currentUser is null', () => {
      component.currentUser = null;
      (component as any).checkPermissions();
      expect(component.canToggleStatus).toBeFalse();
    });
  });

  // ── loadStats ─────────────────────────────────────────────────────────────

  describe('loadStats()', () => {
    it('should set stats from service', () => {
      expect(component.stats).toEqual(MOCK_STATS);
    });

    it('should show snackbar on stats error', () => {
      usersSpy.getStats.and.returnValue(throwError(() => new Error()));
      component.loadStats();
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Failed to load statistics', 'Close', jasmine.any(Object)
      );
    });
  });

  // ── loadUsers ─────────────────────────────────────────────────────────────

  describe('loadUsers()', () => {
    it('should populate users from the page response', () => {
      expect(component.users.length).toBe(1);
      expect(component.users[0].firstName).toBe('Alice');
    });

    it('should set totalElements', () => {
      expect(component.totalElements).toBe(1);
    });

    it('should pass current page and page size to getUsers', () => {
      component.currentPage = 2;
      component.pageSize    = 5;
      component.loadUsers();
      expect(usersSpy.getUsers).toHaveBeenCalledWith(2, 5, jasmine.any(String));
    });

    it('should show snackbar on getUsers error', () => {
      usersSpy.getUsers.and.returnValue(throwError(() => ({ status: 500 })));
      component.loadUsers();
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Failed to load users', 'Close', jasmine.any(Object)
      );
    });

    it('should navigate to login on 401 error', () => {
      usersSpy.getUsers.and.returnValue(throwError(() => ({ status: 401 })));
      component.loadUsers();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('should navigate to login on 403 error', () => {
      usersSpy.getUsers.and.returnValue(throwError(() => ({ status: 403 })));
      component.loadUsers();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('should apply activeFilter client-side', () => {
      usersSpy.getUsers.and.returnValue(of(makePageResponse([
        makeUserDTO({ active: true,  enabled: true  }),
        makeUserDTO({ id: 2, active: false, enabled: true }),
      ])));
      component.activeFilter = 'ACTIVE';
      component.loadUsers();
      expect(component.users.every(u => component.getStatus(u).toUpperCase() === 'ACTIVE')).toBeTrue();
    });

    it('should apply selectedDepartment filter client-side', () => {
      usersSpy.getUsers.and.returnValue(of(makePageResponse([
        makeUserDTO({ department: 'IT' }),
        makeUserDTO({ id: 2, department: 'HR' }),
      ])));
      component.selectedDepartment = 'IT';
      component.loadUsers();
      expect(component.users.every(u => u.department === 'IT')).toBeTrue();
    });

    it('should apply selectedRole filter client-side', () => {
      usersSpy.getUsers.and.returnValue(of(makePageResponse([
        makeUserDTO({ roles: ['ROLE_EMPLOYEE'] }),
        makeUserDTO({ id: 2, roles: ['ROLE_ADMIN'] }),
      ])));
      component.selectedRole = 'employee';
      component.loadUsers();
      expect(component.users.length).toBe(1);
    });
  });

  // ── applyFilter / searchSubject ───────────────────────────────────────────

describe('applyFilter()', () => {
  it('should debounce and call loadUsers after 400ms', fakeAsync(() => {
    usersSpy.getUsers.calls.reset();
    component.applyFilter('alice');
    tick(400);
    expect(usersSpy.getUsers).toHaveBeenCalledWith(0, jasmine.any(Number), 'alice');
  }));

  it('should reset currentPage to 0 on search', fakeAsync(() => {
    component.currentPage = 3;
    component.applyFilter('bob');
    tick(400);
    expect(component.currentPage).toBe(0);
  }));
});
  // ── filter methods ────────────────────────────────────────────────────────

  describe('filterByStatus()', () => {
    it('should set activeFilter and reload', () => {
      usersSpy.getUsers.calls.reset();
      component.filterByStatus('ACTIVE');
      expect(component.activeFilter).toBe('ACTIVE');
      expect(usersSpy.getUsers).toHaveBeenCalled();
    });

    it('should toggle activeFilter off when same status is clicked again', () => {
      component.activeFilter = 'ACTIVE';
      component.filterByStatus('ACTIVE');
      expect(component.activeFilter).toBeNull();
    });
  });

  describe('filterByDepartment()', () => {
    it('should set selectedDepartment and reload', () => {
      component.filterByDepartment('HR');
      expect(component.selectedDepartment).toBe('HR');
      expect(usersSpy.getUsers).toHaveBeenCalled();
    });
  });

  describe('filterByRole()', () => {
    it('should set selectedRole and reload', () => {
      component.filterByRole('Admin');
      expect(component.selectedRole).toBe('Admin');
    });
  });

  describe('resetFilters()', () => {
    it('should clear all filters and reload', () => {
      component.activeFilter        = 'ACTIVE';
      component.selectedDepartment  = 'IT';
      component.selectedRole        = 'Admin';
      component.searchKeyword       = 'alice';
      component.resetFilters();
      expect(component.activeFilter).toBeNull();
      expect(component.selectedDepartment).toBeNull();
      expect(component.selectedRole).toBeNull();
      expect(component.searchKeyword).toBe('');
    });
  });

  // ── pagination ────────────────────────────────────────────────────────────

  describe('onPageChange()', () => {
    it('should update currentPage and pageSize then reload', () => {
      const event = { pageIndex: 2, pageSize: 25 } as PageEvent;
      component.onPageChange(event);
      expect(component.currentPage).toBe(2);
      expect(component.pageSize).toBe(25);
      expect(usersSpy.getUsers).toHaveBeenCalledWith(2, 25, jasmine.any(String));
    });
  });

  describe('onCustomPageChange()', () => {
    it('should update currentPage then reload', () => {
      component.onCustomPageChange(4);
      expect(component.currentPage).toBe(4);
      expect(usersSpy.getUsers).toHaveBeenCalled();
    });
  });

  // ── navigation ────────────────────────────────────────────────────────────

  describe('navigation helpers', () => {
    it('addUser() should navigate to /users/new', () => {
      component.addUser();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/users/new']);
    });

    it('viewUser() should navigate to /users/:id', () => {
      component.viewUser(makeUserDTO({ id: 3 }));
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/users', 3]);
    });

    it('editUser() should navigate to /users/:id/edit', () => {
      component.editUser(makeUserDTO({ id: 5 }));
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/users', 5, 'edit']);
    });

    it('exportUsers() should open a snackbar', () => {
      component.exportUsers();
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Exporting users...', 'Close', jasmine.objectContaining({ duration: 2000 })
      );
    });
  });

  // ── user actions ──────────────────────────────────────────────────────────

  describe('approveUser()', () => {
    let user: UserDTO;
    beforeEach(() => {
      user = makeUserDTO({ firstName: 'Bob', lastName: 'Jones' });
      spyOn(window, 'confirm').and.returnValue(true);
      usersSpy.approveUser.and.returnValue(of(void 0 as any));
    });

    it('should call usersService.approveUser', () => {
      component.approveUser(user);
      expect(usersSpy.approveUser).toHaveBeenCalledWith(user.id);
    });

    it('should show success snackbar', () => {
      component.approveUser(user);
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Bob Jones approved', 'Close', jasmine.any(Object)
      );
    });

    it('should not call approveUser when confirm is cancelled', () => {
      (window.confirm as jasmine.Spy).and.returnValue(false);
      component.approveUser(user);
      expect(usersSpy.approveUser).not.toHaveBeenCalled();
    });

    it('should show error snackbar on failure', () => {
      usersSpy.approveUser.and.returnValue(throwError(() => new Error()));
      component.approveUser(user);
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Failed to approve user', 'Close', jasmine.any(Object)
      );
    });
  });

  describe('rejectUser()', () => {
    let user: UserDTO;
    beforeEach(() => {
      user = makeUserDTO();
      spyOn(window, 'confirm').and.returnValue(true);
      usersSpy.rejectUser.and.returnValue(of(void 0 as any));
    });
    it('should call rejectUser and show snackbar', () => {
      component.rejectUser(user);
      expect(usersSpy.rejectUser).toHaveBeenCalledWith(user.id);
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        jasmine.stringContaining('rejected'), 'Close', jasmine.any(Object)
      );
    });
    it('should not act when confirm cancelled', () => {
      (window.confirm as jasmine.Spy).and.returnValue(false);
      component.rejectUser(user);
      expect(usersSpy.rejectUser).not.toHaveBeenCalled();
    });
  });

  describe('disableUser()', () => {
    let user: UserDTO;
    beforeEach(() => {
      user = makeUserDTO();
      spyOn(window, 'confirm').and.returnValue(true);
      usersSpy.disableUser.and.returnValue(of(void 0 as any));
    });
    it('should call disableUser', () => {
      component.disableUser(user);
      expect(usersSpy.disableUser).toHaveBeenCalledWith(user.id);
    });
  });

  describe('enableUser()', () => {
    let user: UserDTO;
    beforeEach(() => {
      user = makeUserDTO();
      spyOn(window, 'confirm').and.returnValue(true);
      usersSpy.enableUser.and.returnValue(of(void 0 as any));
    });
    it('should call enableUser', () => {
      component.enableUser(user);
      expect(usersSpy.enableUser).toHaveBeenCalledWith(user.id);
    });
  });

  describe('resetPassword()', () => {
    let user: UserDTO;
    beforeEach(() => {
      user = makeUserDTO();
      spyOn(window, 'confirm').and.returnValue(true);
      usersSpy.resetPassword.and.returnValue(of(void 0 as any));
    });
    it('should show success snackbar', () => {
      component.resetPassword(user);
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Password reset email sent', 'Close', jasmine.any(Object)
      );
    });
    it('should show error snackbar on failure', () => {
      usersSpy.resetPassword.and.returnValue(throwError(() => new Error()));
      component.resetPassword(user);
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Failed to reset password', 'Close', jasmine.any(Object)
      );
    });
  });

  // ── getStatus ────────────────────────────────────────────────────────────

  describe('getStatus()', () => {
    it('should return "rejected" when registrationRejected is true', () => {
      expect(component.getStatus({ registrationRejected: true } as any)).toBe('rejected');
    });

    it('should return "pending" when registrationPending is true', () => {
      expect(component.getStatus(makeUserDTO({ registrationPending: true }))).toBe('pending');
    });

    it('should return "pending" when not enabled', () => {
      expect(component.getStatus(makeUserDTO({ enabled: false }))).toBe('pending');
    });

    it('should return "locked" when accountNonLocked is false', () => {
      expect(component.getStatus(makeUserDTO({ accountNonLocked: false }))).toBe('locked');
    });

    it('should return "disabled" when enabled but not active', () => {
      expect(component.getStatus(makeUserDTO({ enabled: true, active: false }))).toBe('disabled');
    });

    it('should return "active" for a fully active user', () => {
      expect(component.getStatus(makeUserDTO())).toBe('active');
    });
  });

  // ── helpers ───────────────────────────────────────────────────────────────

  describe('getInitials()', () => {
    it('should return upper-cased initials', () => {
      expect(component.getInitials(makeUserDTO())).toBe('AS');
    });

    it('should handle missing firstName', () => {
      expect(component.getInitials(makeUserDTO({ firstName: '' }))).toBe('S');
    });
  });

  describe('getRoleLabel()', () => {
    it('should strip ROLE_ prefix and replace underscores', () => {
      expect(component.getRoleLabel(makeUserDTO({ roles: ['ROLE_GENERAL_MANAGER'] }))).toBe('GENERAL MANAGER');
    });

    it('should return EMPLOYEE when roles is empty', () => {
      expect(component.getRoleLabel(makeUserDTO({ roles: [] }))).toBe('EMPLOYEE');
    });
  });

  describe('min()', () => {
    it('should return the smaller value', () => {
      expect(component.min(3, 7)).toBe(3);
      expect(component.min(9, 2)).toBe(2);
    });
  });
});