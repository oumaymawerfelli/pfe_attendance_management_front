import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { MatSelectModule } from '@angular/material/select';
import { EditProfileDialogComponent } from './edit-profile-dialog.component';
import { AuthService } from '@core/authentication';
import { UserService } from '@core/services/user.service';
import { NoopAnimationPlayer } from '@angular/animations';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

const mockUser = {
  id: 1,
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@test.com',
  phone: '12345678',
  address: '123 Main St',
  maritalStatus: 'SINGLE',
  description: 'Test user',
};

describe('EditProfileDialogComponent', () => {
  let component: EditProfileDialogComponent;
  let fixture: ComponentFixture<EditProfileDialogComponent>;

  const mockDialogRef = {
    close: jasmine.createSpy('close'),
  };

  const mockDialog = {
    open: jasmine.createSpy('open').and.returnValue({
      afterClosed: () => of(true),
    }),
  };

  const mockSnackBar = {
    open: jasmine.createSpy('open'),
  };

  const mockAuthService = {
    user: jasmine.createSpy('user').and.returnValue(of(mockUser)),
  };

  const mockUserService = {
    setUser: jasmine.createSpy('setUser'),
  };

  beforeEach(async () => {
    mockDialogRef.close.calls.reset();
    mockDialog.open.calls.reset();

    await TestBed.configureTestingModule({
      declarations: [EditProfileDialogComponent],
      schemas: [NO_ERRORS_SCHEMA],
      imports: [
        HttpClientTestingModule,
        ReactiveFormsModule,
        MatSelectModule,
        NoopAnimationsModule,
        MatFormFieldModule,
        MatInputModule,
      ],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { user: mockUser } },
        { provide: MatDialog, useValue: mockDialog },
        { provide: MatSnackBar, useValue: mockSnackBar },
        { provide: AuthService, useValue: mockAuthService },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditProfileDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should build the form with user data on init', () => {
    expect(component.form.get('firstName')?.value).toBe('John');
    expect(component.form.get('lastName')?.value).toBe('Doe');
    expect(component.form.get('phone')?.value).toBe('12345678');
  });

  it('should return correct initials', () => {
    expect(component.getInitials()).toBe('JD');
  });

  it('should close dialog with false on cancel', () => {
    component.onCancel();
    expect(mockDialogRef.close).toHaveBeenCalledWith(false);
  });

  it('should show error for required fields', () => {
    component.form.get('firstName')?.setValue('');
    component.form.get('firstName')?.markAsTouched();
    expect(component.getError('firstName')).toBe('This field is required');
  });

  it('should show error for too-short fields', () => {
    component.form.get('firstName')?.setValue('A');
    component.form.get('firstName')?.markAsTouched();
    expect(component.getError('firstName')).toContain('Minimum');
  });

  it('should show error for invalid phone pattern', () => {
    component.form.get('phone')?.setValue('abc');
    component.form.get('phone')?.markAsTouched();
    expect(component.getError('phone')).toBe('Must be exactly 8 digits');
  });

  it('should not save if form is invalid', () => {
    component.form.get('firstName')?.setValue('');
    component.onSave();
    expect(mockDialogRef.close).not.toHaveBeenCalled();
  });

  it('should clear selected photo on removePhoto', () => {
    component.avatarPreview = 'some-url';
    component.selectedFile = new File([''], 'test.jpg');
    component.removePhoto();
    expect(component.avatarPreview).toBeNull();
    expect(component.selectedFile).toBeNull();
  });
});
