import { Component, Inject } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-missed-checkout-dialog',
  templateUrl: './missed-checkout-dialog.component.html',
})
export class MissedCheckoutDialogComponent {
  checkOutTime = new FormControl('', [Validators.required]);
  saving = false;
  error = '';

  constructor(
    public dialogRef: MatDialogRef<MissedCheckoutDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  confirm() {
    if (this.checkOutTime.valid) {
      this.saving = true;
      this.error = '';

      // Simulate API call
      setTimeout(() => {
        this.saving = false;
        this.dialogRef.close(this.checkOutTime.value);
      }, 1000);
    }
  }

  skip() {
    this.dialogRef.close(null);
  }
}
