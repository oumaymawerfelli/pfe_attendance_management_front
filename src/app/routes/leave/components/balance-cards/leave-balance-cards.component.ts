import { Component, OnInit } from '@angular/core';
import { LeaveService } from '../../services/leave.service';
import { LeaveBalance } from '../../models/leave.model';

@Component({
  selector: 'app-leave-balance-cards',
  templateUrl: './leave-balance-cards.component.html',
  styleUrls: ['./leave-balance-cards.component.scss'],
})
export class LeaveBalanceCardsComponent implements OnInit {
  balance: LeaveBalance | null = null;
  loading = true;

  constructor(private leaveService: LeaveService) {}

  ngOnInit(): void {
    this.leaveService.getMyBalance().subscribe({
      next: (data) => { this.balance = data; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }
}