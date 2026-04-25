import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-table-kitchen-sink-edit',
  template: `
    <h2 mat-dialog-title>Edit Record</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Name</mat-label>
        <input matInput [(ngModel)]="record.name" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Weight</mat-label>
        <input matInput type="number" [(ngModel)]="record.weight" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Symbol</mat-label>
        <input matInput [(ngModel)]="record.symbol" />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-raised-button color="primary" (click)="dialogRef.close(record)">Save</button>
    </mat-dialog-actions>
  `,
})
export class TablesKitchenSinkEditComponent {
  record: any;

  constructor(
    public dialogRef: MatDialogRef<TablesKitchenSinkEditComponent>,
    @Inject(MAT_DIALOG_DATA) data: { record: any }
  ) {
    this.record = { ...data.record };
  }
}
