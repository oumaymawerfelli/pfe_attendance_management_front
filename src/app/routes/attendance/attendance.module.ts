import { NgModule } from '@angular/core';
import { SharedModule } from '@shared/shared.module';
import { NgxChartsModule } from '@swimlane/ngx-charts';

import { AttendanceRoutingModule } from './attendance-routing.module';
import { AttendanceDashboardComponent } from './components/dashboard/attendance-dashboard.component';
import { AttendanceHistoryComponent } from './components/history/attendance-history.component';

@NgModule({
  imports: [
    SharedModule,
    AttendanceRoutingModule,
    NgxChartsModule,
  ],
  declarations: [
    AttendanceDashboardComponent,
    AttendanceHistoryComponent,
  ],
})
export class AttendanceModule {}