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

  /** Drives [(selectedIndex)] on the tab group — 0 = Request, 1 = My Requests */
  activeTab = 0;

  /**
   * Reference to the balance cards so we can refresh them after a submission.
   * The component lives inside tab 1, so it may be undefined until that tab
   * is first opened — optional chaining (?.) handles that safely.
   */
  @ViewChild(LeaveBalanceCardsComponent) balanceCards?: LeaveBalanceCardsComponent;
  @ViewChild(LeaveHistoryComponent)      leaveHistory?: LeaveHistoryComponent;

  constructor(private snackBar: MatSnackBar) {}

  // ── Called by the request form's @Output() emitters ───────────────────────

  /**
   * Switches to the history tab so the user immediately sees
   * their newly submitted request without any extra click.
   */
  onLeaveSubmitted(): void {
    this.activeTab = 1;
    // If the user previously visited "My Requests" the balance cards are
    // already initialised and showing stale data — refresh them.
    // setTimeout(0) ensures the tab switch renders before we call refresh().
    setTimeout(() => {
      this.balanceCards?.refresh();
      this.leaveHistory?.refresh();
    }, 0);
  }

  /**
   * Shows a non-intrusive snack bar — the user stays on the form
   * so they can keep editing or submit later.
   */
 onDraftSaved(): void {
  this.snackBar.open(
    'Draft saved — you can continue anytime from My Requests.',
    'OK',
    { duration: 5000, horizontalPosition: 'right', verticalPosition: 'bottom' },
  );

  // Refresh history so the draft shows up
  setTimeout(() => {
    this.leaveHistory?.refresh();   // ← add this
  }, 0);
}

  // ── Tab navigation helpers (used by header buttons) ───────────────────────

  goToRequests(): void { this.activeTab = 1; }
  goToForm():     void { this.activeTab = 0; }
}