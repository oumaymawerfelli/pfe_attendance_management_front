import {
  ComponentFixture, TestBed,
  fakeAsync, tick,
} from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Subject, BehaviorSubject, of } from 'rxjs';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import { ProfileOverviewComponent }   from './overview.component';
import { AuthService, User }          from '@core/authentication';
import { EditProfileDialogComponent } from '../edit-profile-dialog/edit-profile-dialog.component';

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

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('ProfileOverviewComponent', () => {
  let component: ProfileOverviewComponent;
  let fixture:   ComponentFixture<ProfileOverviewComponent>;
  let authSpy:   jasmine.SpyObj<AuthService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let user$:     BehaviorSubject<User | null>;

  beforeEach(async () => {
    user$ = new BehaviorSubject<User | null>(null);

    authSpy   = jasmine.createSpyObj('AuthService', ['user']);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

authSpy.user.and.returnValue(user$.asObservable() as any);
    await TestBed.configureTestingModule({
      declarations: [ProfileOverviewComponent],
      schemas:      [NO_ERRORS_SCHEMA],
      providers: [
        { provide: AuthService, useValue: authSpy  },
        { provide: MatDialog,   useValue: dialogSpy },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(ProfileOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  // ── Creation ──────────────────────────────────────────────────────────────

  describe('creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should start with a null user', () => {
      expect(component.user).toBeNull();
    });
  });

  // ── ngOnInit ──────────────────────────────────────────────────────────────

  describe('ngOnInit — auth.user() subscription', () => {
    it('should set user when auth emits a valid user', () => {
      const u = makeUser();
      user$.next(u);
      expect(component.user).toEqual(u);
    });

    it('should set user to null when auth emits null', () => {
      user$.next(makeUser());
      user$.next(null);
      expect(component.user).toBeNull();
    });

    it('should reflect the latest emission', () => {
      user$.next(makeUser({ firstName: 'Alice' }));
      user$.next(makeUser({ firstName: 'Bob'   }));
      expect(component.user!.firstName).toBe('Bob');
    });
  });

  // ── ngOnDestroy ───────────────────────────────────────────────────────────

  describe('ngOnDestroy', () => {
    it('should call next and complete on destroy$', () => {
      const destroy$ = (component as any).destroy$ as Subject<void>;
      spyOn(destroy$, 'next').and.callThrough();
      spyOn(destroy$, 'complete').and.callThrough();
      component.ngOnDestroy();
      expect(destroy$.next).toHaveBeenCalled();
      expect(destroy$.complete).toHaveBeenCalled();
    });

    it('should stop reacting to auth after destroy', () => {
      user$.next(makeUser({ firstName: 'Alice' }));
      component.ngOnDestroy();
      user$.next(makeUser({ firstName: 'Ghost' }));
      expect(component.user!.firstName).toBe('Alice');
    });
  });

  // ── openEditDialog ────────────────────────────────────────────────────────

  describe('openEditDialog()', () => {
    beforeEach(() => {
      const dialogRefSpy = jasmine.createSpyObj<MatDialogRef<EditProfileDialogComponent>>(
        'MatDialogRef', ['afterClosed']
      );
      dialogRefSpy.afterClosed.and.returnValue(of(null));
      dialogSpy.open.and.returnValue(dialogRefSpy as any);
    });

    it('should open EditProfileDialogComponent', () => {
      component.openEditDialog();
      expect(dialogSpy.open).toHaveBeenCalledWith(
        EditProfileDialogComponent,
        jasmine.any(Object)
      );
    });

    it('should pass the current user as dialog data', () => {
      const u = makeUser();
      user$.next(u);
      component.openEditDialog();
      expect(dialogSpy.open).toHaveBeenCalledWith(
        EditProfileDialogComponent,
        jasmine.objectContaining({ data: { user: u } })
      );
    });

    it('should open with width 550px', () => {
      component.openEditDialog();
      expect(dialogSpy.open).toHaveBeenCalledWith(
        EditProfileDialogComponent,
        jasmine.objectContaining({ width: '550px' })
      );
    });

    it('should open with maxWidth 95vw', () => {
      component.openEditDialog();
      expect(dialogSpy.open).toHaveBeenCalledWith(
        EditProfileDialogComponent,
        jasmine.objectContaining({ maxWidth: '95vw' })
      );
    });
  });

  // ── contactUser ───────────────────────────────────────────────────────────

  describe('contactUser()', () => {
    let navigateSpy: jasmine.Spy;

    beforeEach(() => {
      navigateSpy = spyOn(component as any, 'navigate');
    });

    it('should navigate to a mailto link with the user email', () => {
      user$.next(makeUser({ email: 'alice@example.com' }));
      component.contactUser();
      expect(navigateSpy).toHaveBeenCalledWith('mailto:alice@example.com');
    });

    it('should not navigate when user is null', () => {
      user$.next(null);
      component.contactUser();
      expect(navigateSpy).not.toHaveBeenCalled();
    });

    it('should not navigate when email is empty string', () => {
      user$.next(makeUser({ email: '' }));
      component.contactUser();
      expect(navigateSpy).not.toHaveBeenCalled();
    });

    it('should not navigate when email is undefined', () => {
      user$.next(makeUser({ email: undefined as any }));
      component.contactUser();
      expect(navigateSpy).not.toHaveBeenCalled();
    });

    it('should not throw when called with no user', () => {
      expect(() => component.contactUser()).not.toThrow();
    });
  });
});