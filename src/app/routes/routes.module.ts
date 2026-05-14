import { NgModule } from '@angular/core';
import { SharedModule } from '@shared/shared.module';
import { RoutesRoutingModule } from './routes-routing.module';

import { DashboardComponent } from './dashboard/dashboard.component';
import { LoginComponent } from './sessions/login/login.component';
import { RegisterComponent } from './sessions/register/register.component';
import { RegistrationSuccessComponent } from './sessions/registration-success/registration-success.component';
import { Error403Component } from './sessions/403.component';
import { Error404Component } from './sessions/404.component';
import { Error500Component } from './sessions/500.component';
import { ActivateAccountComponent } from './sessions/activate-account/activate-account.component';
import { ChangePasswordComponent } from './sessions/change-password/change-password.component';
import { ClockComponent } from './dashboard/clock/clock.component'; // ← seul ajout
import { AttendanceOverviewComponent } from './dashboard/attendance-overview/attendance-overview.component';

const COMPONENTS: any[] = [
  DashboardComponent,
  LoginComponent,
  RegisterComponent,
  RegistrationSuccessComponent,
  ActivateAccountComponent,
  Error403Component,
  Error404Component,
  Error500Component,
];
const COMPONENTS_DYNAMIC: any[] = []; // ← cette ligne était dans ton original, ne pas supprimer

@NgModule({
  imports: [
    SharedModule,
    RoutesRoutingModule,
    ClockComponent,
    AttendanceOverviewComponent, // ← seul ajout ici
  ],
  declarations: [...COMPONENTS, ...COMPONENTS_DYNAMIC, ChangePasswordComponent],
})
export class RoutesModule {}