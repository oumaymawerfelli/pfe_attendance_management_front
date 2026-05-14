import {
  ComponentFixture, TestBed, fakeAsync, tick,
} from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA }   from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar }        from '@angular/material/snack-bar';
import { of, throwError }     from 'rxjs';

import { EditComponent }            from './edit.component';
import { UsersService, UserResponseDTO } from '../user.service';
import { TranslateModule }          from '@ngx-translate/core';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<UserResponseDTO> = {}): UserResponseDTO {
  return {
    id:          1,
    firstName:   'Alice',
    lastName:    'Smith',
    email:       'alice@example.com',
    roles:       ['EMPLOYEE'],
    active:      true,
    enabled:     true,
    avatar:      'https://cdn.example.com/avatar.png',
    phone:       '22334455',
    birthDate:   '1990-01-15',
    gender:      'FEMALE',
    nationality: 'Tunisian',
    maritalStatus: 'SINGLE',
    address:     '12 Main St',
    jobTitle:    'Developer',
    department:  'IT',
    service:     'Backend',
    hireDate:    '2022-06-01',
    contractType: 'CDI',
    contractEndDate: '',
    description: 'Senior dev',
    ...overrides,
  } as UserResponseDTO;   // ← add cast
}

function makeFile(name = 'photo.jpg', type = 'image/jpeg', size = 1024): File {
  return new File(['x'.repeat(size)], name, { type });
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('EditComponent', () => {
  let component:   EditComponent;
  let fixture:     ComponentFixture<EditComponent>;
  let usersSpy:    jasmine.SpyObj<UsersService>;
  let routerSpy:   jasmine.SpyObj<Router>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  const routeStub = { snapshot: { params: { id: 1 } } };

  beforeEach(async () => {
    usersSpy    = jasmine.createSpyObj('UsersService', ['getUser', 'updateUser', 'uploadPhoto']);
    routerSpy   = jasmine.createSpyObj('Router',       ['navigate']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar',  ['open']);

    // Default: getUser resolves successfully
    usersSpy.getUser.and.returnValue(of(makeUser()));

    await TestBed.configureTestingModule({
      imports:      [ReactiveFormsModule, TranslateModule.forRoot()],
      declarations: [EditComponent],
      schemas:      [NO_ERRORS_SCHEMA],
      providers: [
        { provide: UsersService,   useValue: usersSpy    },
        { provide: Router,         useValue: routerSpy   },
        { provide: MatSnackBar,    useValue: snackBarSpy  },
        { provide: ActivatedRoute, useValue: routeStub   },
      ],
    }).compileComponents();

    TestBed.overrideTemplate(EditComponent, '');

    fixture   = TestBed.createComponent(EditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();  // triggers ngOnInit → loadUser
  });

  afterEach(() => { if (fixture) fixture.destroy(); });

  // ── Creation ──────────────────────────────────────────────────────────────

  describe('creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should start with isSaving = false', () => {
      expect(component.isSaving).toBeFalse();
    });

    it('should start with isUploadingPhoto = false', () => {
      expect(component.isUploadingPhoto).toBeFalse();
    });

    it('should start with avatarPreview = null', () => {
      expect(component.avatarPreview).toBeNull();
    });

    it('should start with selectedFile = null', () => {
      expect(component.selectedFile).toBeNull();
    });

    it('should expose department options', () => {
      expect(component.departments).toContain('IT');
    });

    it('should expose role options', () => {
      expect(component.roles).toContain('ADMIN');
    });
  });

  // ── ngOnInit / loadUser ────────────────────────────────────────────────────

  describe('ngOnInit — loadUser()', () => {
    it('should call getUser with the route id', () => {
      expect(usersSpy.getUser).toHaveBeenCalledWith(1);
    });

    it('should set user after successful load', () => {
      expect(component.user).toEqual(makeUser());
    });

    it('should patch the form with user data', () => {
      expect(component.userForm.get('firstName')!.value).toBe('Alice');
      expect(component.userForm.get('email')!.value).toBe('alice@example.com');
    });

    it('should set the role from the first element of roles array', () => {
      expect(component.userForm.get('role')!.value).toBe('EMPLOYEE');
    });

    it('should default role to EMPLOYEE when roles is empty', () => {
      usersSpy.getUser.and.returnValue(of(makeUser({ roles: [] })));
      component.loadUser(1);
      expect(component.userForm.get('role')!.value).toBe('EMPLOYEE');
    });

    it('should set isLoading to false after load', () => {
      expect(component.isLoading).toBeFalse();
    });

    it('should show snackbar and navigate to /users on load error', () => {
      usersSpy.getUser.and.returnValue(throwError(() => new Error('network')));
      component.loadUser(1);
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Failed to load user', 'Close', jasmine.any(Object)
      );
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/users']);
    });

    it('should set isLoading to false on error', () => {
      usersSpy.getUser.and.returnValue(throwError(() => new Error('network')));
      component.loadUser(1);
      expect(component.isLoading).toBeFalse();
    });
  });

  // ── Form getters ──────────────────────────────────────────────────────────

  describe('form getters', () => {
    it('firstName getter returns the firstName control', () => {
      expect(component.firstName).toBe(component.userForm.get('firstName'));
    });

    it('lastName getter returns the lastName control', () => {
      expect(component.lastName).toBe(component.userForm.get('lastName'));
    });

    it('email getter returns the email control', () => {
      expect(component.email).toBe(component.userForm.get('email'));
    });
  });

  // ── onFileSelected ────────────────────────────────────────────────────────

  describe('onFileSelected()', () => {
    function makeEvent(file: File | null): Event {
      const input = document.createElement('input');
      Object.defineProperty(input, 'files', {
        value: file ? [file] : [],
      });
      return { target: input } as unknown as Event;
    }

    it('should do nothing when no file is selected', () => {
      component.onFileSelected(makeEvent(null));
      expect(component.selectedFile).toBeNull();
    });

    it('should reject files with disallowed MIME types', () => {
      const badFile = makeFile('doc.pdf', 'application/pdf');
      component.onFileSelected(makeEvent(badFile));
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Only JPG, PNG or WebP images are allowed', 'Close', jasmine.any(Object)
      );
      expect(component.selectedFile).toBeNull();
    });

    it('should reject files larger than 5MB', () => {
      const bigFile = makeFile('big.jpg', 'image/jpeg', 6 * 1024 * 1024);
      component.onFileSelected(makeEvent(bigFile));
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Image must be smaller than 5MB', 'Close', jasmine.any(Object)
      );
      expect(component.selectedFile).toBeNull();
    });

    it('should accept a valid JPEG file', () => {
      const file = makeFile('photo.jpg', 'image/jpeg', 1024);
      component.onFileSelected(makeEvent(file));
      expect(component.selectedFile).toBe(file);
    });

    it('should accept a valid PNG file', () => {
      const file = makeFile('photo.png', 'image/png', 1024);
      component.onFileSelected(makeEvent(file));
      expect(component.selectedFile).toBe(file);
    });

    it('should accept a valid WebP file', () => {
      const file = makeFile('photo.webp', 'image/webp', 1024);
      component.onFileSelected(makeEvent(file));
      expect(component.selectedFile).toBe(file);
    });
  });

  // ── removePhoto ───────────────────────────────────────────────────────────

  describe('removePhoto()', () => {
    beforeEach(() => {
      component.avatarPreview = 'data:image/png;base64,abc';
      component.selectedFile  = makeFile();
    });

    it('should clear avatarPreview', () => {
      component.removePhoto();
      expect(component.avatarPreview).toBeNull();
    });

    it('should clear selectedFile', () => {
      component.removePhoto();
      expect(component.selectedFile).toBeNull();
    });

    it('should clear user.avatar', () => {
      component.removePhoto();
      expect(component.user!.avatar).toBeUndefined();
    });
  });

  // ── saveUser — guard ──────────────────────────────────────────────────────

  describe('saveUser() — invalid form guard', () => {
    it('should not call updateUser when form is invalid', () => {
      component.userForm.get('firstName')!.setValue('');
      component.saveUser();
      expect(usersSpy.updateUser).not.toHaveBeenCalled();
    });

    it('should show snackbar when form is invalid', () => {
      component.userForm.get('firstName')!.setValue('');
      component.saveUser();
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Please fill all required fields', 'Close', jasmine.any(Object)
      );
    });

    it('should not save when user is null', () => {
      component.user = null;
      component.saveUser();
      expect(usersSpy.updateUser).not.toHaveBeenCalled();
    });
  });

  // ── saveUser — no photo ───────────────────────────────────────────────────

  describe('saveUser() — save without photo', () => {
    beforeEach(() => {
      usersSpy.updateUser.and.returnValue(of(void 0 as any));
    });

    it('should call updateUser with the correct payload', () => {
      component.saveUser();
      const payload = usersSpy.updateUser.calls.mostRecent().args[1] as any;
expect(payload.roleNames).toEqual(['EMPLOYEE']);
    });

    it('should navigate to the user detail page on success', () => {
      component.saveUser();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/users', 1]);
    });

    it('should show success snackbar', () => {
      component.saveUser();
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'User updated successfully', 'Close', jasmine.any(Object)
      );
    });

    it('should reset isSaving to false on success', () => {
      component.saveUser();
      expect(component.isSaving).toBeFalse();
    });

    it('should show error snackbar on updateUser failure', () => {
      usersSpy.updateUser.and.returnValue(
        throwError(() => ({ error: { message: 'Conflict' } }))
      );
      component.saveUser();
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Failed to update user: Conflict', 'Close', jasmine.any(Object)
      );
    });

    it('should reset isSaving to false on updateUser error', () => {
      usersSpy.updateUser.and.returnValue(
        throwError(() => ({ error: {} }))
      );
      component.saveUser();
      expect(component.isSaving).toBeFalse();
    });
  });

  // ── saveUser — with photo ─────────────────────────────────────────────────

  describe('saveUser() — save with photo', () => {
    beforeEach(() => {
      component.selectedFile = makeFile();
    usersSpy.uploadPhoto.and.returnValue(
  of({ avatarUrl: 'https://cdn.example.com/new.jpg', message: 'OK' })
);
      usersSpy.updateUser.and.returnValue(of(void 0 as any));
    });

    it('should call uploadPhoto before updateUser', () => {
      component.saveUser();
      expect(usersSpy.uploadPhoto).toHaveBeenCalledBefore(usersSpy.updateUser);
    });

    it('should pass the user id to uploadPhoto', () => {
      component.saveUser();
      expect(usersSpy.uploadPhoto).toHaveBeenCalledWith(1, jasmine.any(FormData));
    });

    it('should update user.avatar with the returned URL', () => {
      component.saveUser();
      expect(component.user!.avatar).toBe('https://cdn.example.com/new.jpg');
    });

    it('should clear selectedFile after successful upload', () => {
      component.saveUser();
      expect(component.selectedFile).toBeNull();
    });

    it('should still call updateUser after successful upload', () => {
      component.saveUser();
      expect(usersSpy.updateUser).toHaveBeenCalled();
    });

    it('should show photo error snackbar and not call updateUser on upload failure', () => {
      usersSpy.uploadPhoto.and.returnValue(
        throwError(() => ({ error: { message: 'Too large' } }))
      );
      component.saveUser();
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Failed to upload photo: Too large', 'Close', jasmine.any(Object)
      );
      expect(usersSpy.updateUser).not.toHaveBeenCalled();
    });

    it('should reset isSaving to false on upload failure', () => {
      usersSpy.uploadPhoto.and.returnValue(
        throwError(() => ({ error: {} }))
      );
      component.saveUser();
      expect(component.isSaving).toBeFalse();
    });
  });

  // ── cancel ────────────────────────────────────────────────────────────────

  describe('cancel()', () => {
    it('should navigate to /users/:id when user is loaded', () => {
      component.cancel();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/users', 1]);
    });

    it('should navigate to /users when user is null', () => {
      component.user = null;
      component.cancel();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/users']);
    });
  });

  // ── getInitials ───────────────────────────────────────────────────────────

  describe('getInitials()', () => {
    it('should return empty string when user is null', () => {
      component.user = null;
      expect(component.getInitials()).toBe('');
    });

    it('should return upper-cased first letters of first and last name', () => {
      expect(component.getInitials()).toBe('AS');
    });

    it('should handle missing firstName gracefully', () => {
      component.user = makeUser({ firstName: '' });
      expect(component.getInitials()).toBe('S');
    });

    it('should handle missing lastName gracefully', () => {
      component.user = makeUser({ lastName: '' });
      expect(component.getInitials()).toBe('A');
    });
  });
});