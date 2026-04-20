import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { OvertimeDialogComponent } from '../components/overtime-dialog/overtime-dialog.component';

@Injectable({ providedIn: 'root' })
export class OvertimeCheckService {
  private dialogShown = false;

  constructor(private dialog: MatDialog) {}

  startChecking() {
    this.dialogShown = false;

    setInterval(() => {
      const now = new Date();

      // 17:00 = overtime confirmation time
      if (now.getHours() === 17 && now.getMinutes() === 0 && !this.dialogShown) {
        this.dialogShown = true;

        this.dialog.open(OvertimeDialogComponent, {
          width: '380px',
          disableClose: true,
        });
      }
    }, 60000); // check every minute
  }
}
