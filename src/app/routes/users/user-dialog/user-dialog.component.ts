import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-user-dialog',
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Add New User' : 'Edit User' }}</h2>
    
    <mat-dialog-content>
      <div class="user-form">
        <p class="text-grey-500">User form will be implemented here</p>
        
        <pre class="p-16 bg-grey-100">{{ data.user | json }}</pre>
      </div>
    </mat-dialog-content>
    
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" [mat-dialog-close]="true">Save</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .user-form {
      min-width: 400px;
      padding: 16px 0;
    }
  `]
})
export class UserDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<UserDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { mode: 'create' | 'edit'; user?: any }
  ) {}
}