import { NgModule } from '@angular/core';
import { SharedModule } from '@shared/shared.module';
import { LeaveRoutingModule } from './leave-routing.module';
import { LeavePageComponent } from './components/leave-page/leave-page.component';
import { LeaveBalanceCardsComponent } from './components/balance-cards/leave-balance-cards.component';
import { LeaveRequestFormComponent } from './components/request-form/leave-request-form.component';
import { LeaveHistoryComponent } from './components/history/leave-history.component';

@NgModule({
  imports: [SharedModule, LeaveRoutingModule],
  declarations: [
    LeavePageComponent,
    LeaveBalanceCardsComponent,
    LeaveRequestFormComponent,
    LeaveHistoryComponent,
  ],
})
export class LeaveModule {}