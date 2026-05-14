import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA }          from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { UserDialogComponent } from './user-dialog.component';

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('UserDialogComponent', () => {
  let component:   UserDialogComponent;
  let fixture:     ComponentFixture<UserDialogComponent>;
  let dialogSpy:   jasmine.SpyObj<MatDialogRef<UserDialogComponent>>;

  function createComponent(data: { mode: 'create' | 'edit'; user?: any }) {
    dialogSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      declarations: [UserDialogComponent],
      schemas:      [NO_ERRORS_SCHEMA],
      providers: [
        { provide: MatDialogRef,    useValue: dialogSpy },
        { provide: MAT_DIALOG_DATA, useValue: data      },
      ],
    });

    TestBed.overrideTemplate(UserDialogComponent, '');
    fixture   = TestBed.createComponent(UserDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => fixture?.destroy());

  // ── Creation ──────────────────────────────────────────────────────────────

  describe('creation', () => {
    it('should create in create mode', () => {
      createComponent({ mode: 'create' });
      expect(component).toBeTruthy();
    });

    it('should create in edit mode', () => {
      createComponent({ mode: 'edit', user: { id: 1, firstName: 'Alice' } });
      expect(component).toBeTruthy();
    });
  });

  // ── data binding ─────────────────────────────────────────────────────────

  describe('data binding', () => {
    it('should expose mode = "create"', () => {
      createComponent({ mode: 'create' });
      expect(component.data.mode).toBe('create');
    });

    it('should expose mode = "edit"', () => {
      createComponent({ mode: 'edit' });
      expect(component.data.mode).toBe('edit');
    });

    it('should expose the injected user in edit mode', () => {
      const user = { id: 7, firstName: 'Bob' };
      createComponent({ mode: 'edit', user });
      expect(component.data.user).toEqual(user);
    });

    it('should expose undefined user in create mode', () => {
      createComponent({ mode: 'create' });
      expect(component.data.user).toBeUndefined();
    });
  });

  // ── dialogRef ─────────────────────────────────────────────────────────────

  describe('dialogRef', () => {
    it('should expose the injected dialogRef', () => {
      createComponent({ mode: 'create' });
      expect(component.dialogRef).toBe(dialogSpy);
    });
  });
});