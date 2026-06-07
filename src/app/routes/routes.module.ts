import { NgModule } from '@angular/core';
import { SharedModule }          from '@shared/shared.module';
import { RoutesRoutingModule }   from './routes-routing.module';

import { DashboardComponent }           from './dashboard/dashboard.component';
import { LoginComponent }               from './sessions/login/login.component';
import { RegisterComponent }            from './sessions/register/register.component';
import { RegistrationSuccessComponent } from './sessions/registration-success/registration-success.component';
import { Error403Component }            from './sessions/403.component';
import { Error404Component }            from './sessions/404.component';
import { Error500Component }            from './sessions/500.component';
import { ActivateAccountComponent }     from './sessions/activate-account/activate-account.component';
import { ChangePasswordComponent }      from './sessions/change-password/change-password.component';
import { ClockComponent }               from './dashboard/clock/clock.component';
import { AttendanceOverviewComponent }  from './dashboard/attendance-overview/attendance-overview.component';
import { ChatbotComponent }             from './dashboard/chatbot/chatbot.component';
import { DashboardHeaderComponent }     from './dashboard/dashboard-header/dashboard-header.component';
import { EmployeeDashboardComponent }   from './dashboard/employee-dashboard/employee-dashboard.component';
import { AttendanceModule }             from './attendance/attendance.module';
import { PresenceSheetComponent }       from './dashboard/presence-sheet/presence-sheet.component';

import { DemotivationDashboardComponent } from './demotivation/demotivation-dashboard/demotivation-dashboard.component';
//import { WellbeingOverviewComponent } from './dashboard/wellbeing-overview/wellbeing-overview.component';
//import { WellbeingWidgetComponent }     from './dashboard/wellbeing-widget/wellbeing-widget.component';
//import { WellbeingOverviewComponent }   from './dashboard/wellbeing-overview/wellbeing-overview.component';

const COMPONENTS: any[] = [
  DashboardComponent,
  DashboardHeaderComponent,
  LoginComponent,
  RegisterComponent,
  RegistrationSuccessComponent,
  ActivateAccountComponent,
  Error403Component,
  Error404Component,
  Error500Component,
];
const COMPONENTS_DYNAMIC: any[] = [];

@NgModule({
  imports: [
    SharedModule,
    RoutesRoutingModule,
    ClockComponent,
    AttendanceOverviewComponent,
    ChatbotComponent,
    AttendanceModule,
    PresenceSheetComponent,       // standalone → imports
   //WellbeingWidgetComponent,     // standalone → imports
   // WellbeingOverviewComponent,   // standalone → imports
  ],
  declarations: [
    ...COMPONENTS,
    ...COMPONENTS_DYNAMIC,
    ChangePasswordComponent,
    EmployeeDashboardComponent,
  
    DemotivationDashboardComponent,
     // non-standalone → declarations
  ],
})
export class RoutesModule {}