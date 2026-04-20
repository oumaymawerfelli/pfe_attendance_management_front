import { NgModule } from '@angular/core';
import { SharedModule } from '@shared/shared.module';
import { LeaveRoutingModule } from './leave-routing.module';
import { LeavePageComponent } from './components/leave-page/leave-page.component';
import { LeaveBalanceCardsComponent } from './components/balance-cards/leave-balance-cards.component';
import { LeaveRequestFormComponent } from './components/request-form/leave-request-form.component';
import { LeaveHistoryComponent } from './components/history/leave-history.component';
import { AdminLeavesComponent } from './components/admin-leaves/admin-leaves.component';
import { LeaveDetailDialogComponent } from './components/leave-detail-dialog/leave-detail-dialog.component';

@NgModule({
  imports: [SharedModule, LeaveRoutingModule],
  declarations: [
    LeavePageComponent,
    LeaveBalanceCardsComponent,
    LeaveRequestFormComponent,
    LeaveHistoryComponent,
    AdminLeavesComponent,
    LeaveDetailDialogComponent,
  ],
})
export class LeaveModule {}
