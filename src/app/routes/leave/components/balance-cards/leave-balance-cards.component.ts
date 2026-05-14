import { Component, OnInit } from '@angular/core';
import { LeaveService } from '../../services/leave.service';
import { LeaveSummary } from '../../models/leave.model';

@Component({
  selector: 'app-leave-balance-cards',
  templateUrl: './leave-balance-cards.component.html',
  styleUrls: ['./leave-balance-cards.component.scss'],
})
export class LeaveBalanceCardsComponent implements OnInit {
  summary: LeaveSummary | null = null;
  loading = true;

  constructor(private leaveService: LeaveService) {}

  ngOnInit(): void {
    this.load();
  }

  /**
   * Public so leave-page can call this via @ViewChild after a leave is
   * submitted, keeping the cards in sync without a full page reload.
   *
   * Usage in leave-page:
   *   @ViewChild(LeaveBalanceCardsComponent) balanceCards?: LeaveBalanceCardsComponent;
   *   this.balanceCards?.refresh();
   */
  refresh(): void {
    this.load();
  }

  private load(): void {
    this.loading = true;
    this.leaveService.getSummary().subscribe({
      next:  s  => { this.summary = s; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  // ── Template helpers ──────────────────────────────────────────────────────

  annualPct(): number {
    if (!this.summary || this.summary.annualTotal === 0) return 0;
    return (this.summary.annualRemaining / this.summary.annualTotal) * 100;
  }

  sickPct(): number {
    if (!this.summary || this.summary.sickTotal === 0) return 0;
    return (this.summary.sickRemaining / this.summary.sickTotal) * 100;
  }
}