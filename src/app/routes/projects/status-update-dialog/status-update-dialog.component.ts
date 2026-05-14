import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

export interface StatusUpdateDialogData {
  projectName: string;
  currentStatus: string;
  newStatus: string;
  newStatusLabel: string;
  requiresReason: boolean;
}

@Component({
  selector: 'app-status-update-dialog',
  templateUrl: './status-update-dialog.component.html',
  styleUrls: ['./status-update-dialog.component.scss']
})
export class StatusUpdateDialogComponent {
  form: FormGroup;

  private labels: Record<string, string> = {
    PLANNED: 'Planned', IN_PROGRESS: 'In Progress',
    ON_HOLD: 'On Hold', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
  };

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: StatusUpdateDialogData,
    private dialogRef: MatDialogRef<StatusUpdateDialogComponent>,
    private fb: FormBuilder,
  ) {
    this.form = this.fb.group({
      reason: ['', data.requiresReason ? [Validators.required, Validators.maxLength(500)]
                                       : [Validators.maxLength(500)]]
    });
  }

  getLabel(s: string) { return this.labels[s] ?? s; }
  cancel()  { this.dialogRef.close(null); }
  confirm() { this.dialogRef.close(this.form.value.reason); }
}