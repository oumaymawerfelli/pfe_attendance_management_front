import {
  ComponentFixture, TestBed,
  fakeAsync, tick,
} from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Subject, BehaviorSubject, of } from 'rxjs';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import { ProfileLayoutComponent } from './layout.component';
import { AuthService, User }             from '@core/authentication';
import { UserService }                   from '@core/services/user.service';
import { EditProfileDialogComponent }    from '../edit-profile-dialog/edit-profile-dialog.component';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<User> = {}): User {
  return {
    firstName: 'Alice',
    lastName:  'Smith',
    email:     'alice@example.com',
    roles:     ['ROLE_EMPLOYEE'],
    avatar:    '',
    ...overrides,
  };
}

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('ProfileLayoutComponent', () => {
  let component:   ProfileLayoutComponent;
  let fixture:     ComponentFixture<ProfileLayoutComponent>;
  let authSpy:     jasmine.SpyObj<AuthService>;
  let userSpy:     jasmine.SpyObj<UserService>;
  let dialogSpy:   jasmine.SpyObj<MatDialog>;
  let user$:       BehaviorSubject<User | null>;

  const DEFAULT_AVATAR = './assets/images/def-avatar.avif';

  beforeEach(async () => {
    user$ = new BehaviorSubject<User | null>(null);

    authSpy   = jasmine.createSpyObj('AuthService', ['user']);
    userSpy   = jasmine.createSpyObj('UserService', ['setUser'], { user$: user$.asObservable() });
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    // Default: auth returns a valid user
    authSpy.user.and.returnValue(of(makeUser()));

    await TestBed.configureTestingModule({
      declarations: [ProfileLayoutComponent],
      schemas:      [NO_ERRORS_SCHEMA],
      providers: [
        { provide: AuthService,  useValue: authSpy  },
        { provide: UserService,  useValue: userSpy  },
        { provide: MatDialog,    useValue: dialogSpy },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(ProfileLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();   // triggers ngOnInit
  });

  afterEach(() => fixture.destroy());

  // ── Creation ──────────────────────────────────────────────────────────────

  describe('creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should start with default avatar', () => {
      expect(component.avatarUrl).toBe(DEFAULT_AVATAR);
    });

    it('should start with an empty user object', () => {
      // Before user$ emits the component has an empty user
      expect(component.user).toBeDefined();
    });
  });

  // ── ngOnInit — UserService subscription ──────────────────────────────────

  describe('ngOnInit — userService.user$ subscription', () => {
    it('should update user when user$ emits', () => {
      const u = makeUser();
      user$.next(u);
      expect(component.user).toEqual(u);
    });

    it('should update avatarUrl when user has an avatar', () => {
      const u = makeUser({ avatar: 'https://cdn.example.com/avatar.png' });
      user$.next(u);
      expect(component.avatarUrl).toBe('https://cdn.example.com/avatar.png');
    });

    it('should fall back to default avatar when avatar is empty string', () => {
      user$.next(makeUser({ avatar: '' }));
      expect(component.avatarUrl).toBe(DEFAULT_AVATAR);
    });

    it('should fall back to default avatar when avatar is undefined', () => {
      const u = makeUser();
      delete (u as any).avatar;
      user$.next(u);
      expect(component.avatarUrl).toBe(DEFAULT_AVATAR);
    });

    it('should not update user when user$ emits null', () => {
      const u = makeUser();
      user$.next(u);           // set a real user first
      user$.next(null);        // then emit null — should be ignored
      expect(component.user).toEqual(u);
    });
  });

  // ── ngOnInit — AuthService bootstrap ─────────────────────────────────────

  describe('ngOnInit — auth.user() bootstrap', () => {
    it('should call setUser with the auth user on init', () => {
      expect(userSpy.setUser).toHaveBeenCalledWith(makeUser());
    });

    it('should not call setUser when auth returns an empty object', () => {
      userSpy.setUser.calls.reset();
      authSpy.user.and.returnValue(of({} as User));
      component.ngOnInit();
      expect(userSpy.setUser).not.toHaveBeenCalled();
    });

    it('should not call setUser when auth returns null', () => {
      userSpy.setUser.calls.reset();
      authSpy.user.and.returnValue(of(null as any));
      component.ngOnInit();
      expect(userSpy.setUser).not.toHaveBeenCalled();
    });
  });

  // ── ngOnDestroy ───────────────────────────────────────────────────────────

  describe('ngOnDestroy', () => {
    it('should complete destroy$ on destroy', () => {
      const destroy$ = (component as any).destroy$ as Subject<void>;
      spyOn(destroy$, 'next').and.callThrough();
      spyOn(destroy$, 'complete').and.callThrough();
      component.ngOnDestroy();
      expect(destroy$.next).toHaveBeenCalled();
      expect(destroy$.complete).toHaveBeenCalled();
    });

    it('should stop reacting to user$ after destroy', () => {
      component.ngOnDestroy();
      const before = { ...component.user };
      user$.next(makeUser({ firstName: 'Ghost' }));
      // Component is destroyed — user should not have changed
      expect(component.user).toEqual(before);
    });
  });

  // ── role getter ───────────────────────────────────────────────────────────

  describe('role getter', () => {
    it('should return "Employee" when roles is empty', () => {
      component.user = makeUser({ roles: [] });
      expect(component.role).toBe('Employee');
    });

    it('should return "Employee" when roles is undefined', () => {
      component.user = makeUser({ roles: undefined as any });
      expect(component.role).toBe('Employee');
    });

    it('should strip ROLE_ prefix and title-case', () => {
      component.user = makeUser({ roles: ['ROLE_EMPLOYEE'] });
      expect(component.role).toBe('Employee');
    });

    it('should format ROLE_GENERAL_MANAGER correctly', () => {
      component.user = makeUser({ roles: ['ROLE_GENERAL_MANAGER'] });
      expect(component.role).toBe('General Manager');
    });

    it('should format ROLE_PROJECT_MANAGER correctly', () => {
      component.user = makeUser({ roles: ['ROLE_PROJECT_MANAGER'] });
      expect(component.role).toBe('Project Manager');
    });

    it('should format ROLE_ADMIN correctly', () => {
      component.user = makeUser({ roles: ['ROLE_ADMIN'] });
      expect(component.role).toBe('Admin');
    });

    it('should use only the first role', () => {
      component.user = makeUser({ roles: ['ROLE_ADMIN', 'ROLE_EMPLOYEE'] });
      expect(component.role).toBe('Admin');
    });

    it('should handle a role without ROLE_ prefix', () => {
      component.user = makeUser({ roles: ['MANAGER'] });
      expect(component.role).toBe('Manager');
    });
  });

  // ── openEditDialog ────────────────────────────────────────────────────────

  describe('openEditDialog()', () => {
    let dialogRefSpy: jasmine.SpyObj<MatDialogRef<EditProfileDialogComponent>>;
    let afterClosed$: Subject<any>;

    beforeEach(() => {
      afterClosed$ = new Subject<any>();
      dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRefSpy.afterClosed.and.returnValue(afterClosed$.asObservable());
      dialogSpy.open.and.returnValue(dialogRefSpy as any);
    });

    it('should open the EditProfileDialogComponent', () => {
      component.openEditDialog();
      expect(dialogSpy.open).toHaveBeenCalledWith(
        EditProfileDialogComponent,
        jasmine.objectContaining({ data: { user: component.user } })
      );
    });

    it('should open dialog with width 550px', () => {
      component.openEditDialog();
      expect(dialogSpy.open).toHaveBeenCalledWith(
        EditProfileDialogComponent,
        jasmine.objectContaining({ width: '550px' })
      );
    });

    it('should open dialog with maxWidth 95vw', () => {
      component.openEditDialog();
      expect(dialogSpy.open).toHaveBeenCalledWith(
        EditProfileDialogComponent,
        jasmine.objectContaining({ maxWidth: '95vw' })
      );
    });

    it('should open dialog with disableClose=false', () => {
      component.openEditDialog();
      expect(dialogSpy.open).toHaveBeenCalledWith(
        EditProfileDialogComponent,
        jasmine.objectContaining({ disableClose: false })
      );
    });

    it('should subscribe to afterClosed and handle truthy result', fakeAsync(() => {
      const consoleSpy = spyOn(console, 'log');
      component.openEditDialog();
      afterClosed$.next({ updated: true });
      tick();
      expect(consoleSpy).toHaveBeenCalledWith('Profile updated');
    }));

    it('should not log when afterClosed emits null', fakeAsync(() => {
      const consoleSpy = spyOn(console, 'log');
      component.openEditDialog();
      afterClosed$.next(null);
      tick();
      expect(consoleSpy).not.toHaveBeenCalled();
    }));

    it('should not log when afterClosed emits undefined', fakeAsync(() => {
      const consoleSpy = spyOn(console, 'log');
      component.openEditDialog();
      afterClosed$.next(undefined);
      tick();
      expect(consoleSpy).not.toHaveBeenCalled();
    }));
  });

 // ── contactUser ───────────────────────────────────────────────────────────────
describe('contactUser()', () => {
  let navigateSpy: jasmine.Spy;

  beforeEach(() => {
    // Spy on the protected helper — no need to touch window.location at all
    navigateSpy = spyOn(component as any, 'navigate');
  });

  it('should navigate to a mailto link', () => {
    component.user = makeUser({ email: 'alice@example.com' });
    component.contactUser();
    expect(navigateSpy).toHaveBeenCalledWith('mailto:alice@example.com');
  });

  it('should not throw when user email is undefined', () => {
    component.user = makeUser({ email: undefined as any });
    expect(() => component.contactUser()).not.toThrow();
  });

  it('should not navigate when email is empty string', () => {
    component.user = makeUser({ email: '' });
    component.contactUser();
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
});