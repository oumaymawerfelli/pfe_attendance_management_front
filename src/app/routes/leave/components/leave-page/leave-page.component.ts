import { Component, ViewChild } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LeaveBalanceCardsComponent } from '../balance-cards/leave-balance-cards.component';
import { LeaveHistoryComponent } from '../history/leave-history.component';

@Component({
  selector: 'app-leave-page',
  templateUrl: './leave-page.component.html',
  styleUrls: ['./leave-page.component.scss'],
})
export class LeavePageComponent {

  activeTab = 0;

  @ViewChild(LeaveBalanceCardsComponent) balanceCards?: LeaveBalanceCardsComponent;
  @ViewChild(LeaveHistoryComponent)      leaveHistory?: LeaveHistoryComponent;

  constructor(private snackBar: MatSnackBar) {}

  // ── Header labels driven by active tab ────────────────────────────────────

  get activeTabLabel(): string {
    return ['Request Leave', 'Exit Authorization', 'My Requests'][this.activeTab];
  }

  get activeTabSubtitle(): string {
    return [
      'Submit and track your time off requests',
      'Request a short exit during working hours',
      'Your leave history and request status',
    ][this.activeTab];
  }

  // ── Event handlers ────────────────────────────────────────────────────────

  onLeaveSubmitted(): void {
    this.activeTab = 2;
    setTimeout(() => {
      this.balanceCards?.refresh();
      this.leaveHistory?.refresh();
    }, 0);
  }

  onExitSubmitted(): void {
    this.snackBar.open(
      'Exit authorization submitted — awaiting approval.',
      'OK',
      { duration: 4000, horizontalPosition: 'right', verticalPosition: 'bottom' },
    );
    setTimeout(() => this.leaveHistory?.refresh(), 0);
  }

  onDraftSaved(): void {
    this.snackBar.open(
      'Draft saved — you can continue anytime from My Requests.',
      'OK',
      { duration: 5000, horizontalPosition: 'right', verticalPosition: 'bottom' },
    );
    setTimeout(() => this.leaveHistory?.refresh(), 0);
  }
}