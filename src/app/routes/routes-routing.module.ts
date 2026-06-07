import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminLayoutComponent }  from '@theme/admin-layout/admin-layout.component';
import { AuthLayoutComponent }   from '@theme/auth-layout/auth-layout.component';
import { DashboardComponent }    from './dashboard/dashboard.component';
import { LoginComponent }        from './sessions/login/login.component';
import { RegisterComponent }     from './sessions/register/register.component';
import { Error403Component }     from './sessions/403.component';
import { Error404Component }     from './sessions/404.component';
import { Error500Component }     from './sessions/500.component';
import { authGuard }             from '@core/authentication';
import { RegistrationSuccessComponent } from './sessions/registration-success/registration-success.component';
import { ActivateAccountComponent }     from './sessions/activate-account/activate-account.component';
import { ChangePasswordComponent }      from './sessions/change-password/change-password.component';
import { PresenceSheetComponent }       from './dashboard/presence-sheet/presence-sheet.component'; // ← added
import { DemotivationDashboardComponent } from './demotivation/demotivation-dashboard/demotivation-dashboard.component';

const routes: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: '',                  redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',         component: DashboardComponent },
      { path: 'dashboard/presence-sheet', component: PresenceSheetComponent }, 
      { path: 'demotivation',      component: DemotivationDashboardComponent },
      { path: '403',               component: Error403Component },
      { path: '404',               component: Error404Component },
      { path: '500',               component: Error500Component },
      { path: 'change-password',   component: ChangePasswordComponent },
      {
        path: 'attendance',
        loadChildren: () => import('./attendance/attendance.module').then(m => m.AttendanceModule),
      },
      {
        path: 'leave',
        loadChildren: () => import('./leave/leave.module').then(m => m.LeaveModule),
      },
      {
        path: 'admin/documents',
        loadChildren: () => import('./admin/admin-documents.module').then(m => m.AdminDocumentsModule),
      },
      {
        path: 'my-documents',
        loadChildren: () => import('./admin/employee-documents.module').then(m => m.EmployeeDocumentsModule),
      },
      {
        path: 'notifications',
        loadChildren: () => import('./Notification/notifications.module').then(m => m.NotificationsModule),
      },
      {
        path: 'users',
        loadChildren: () => import('./users/users.module').then(m => m.UsersModule),
      },
      {
        path: 'material',
        loadChildren: () => import('./material/material.module').then(m => m.MaterialModule),
      },
      {
        path: 'profile',
        loadChildren: () => import('./profile/profile.module').then(m => m.ProfileModule),
      },
      {
        path: 'projects',
        loadChildren: () => import('./projects/projects.module').then(m => m.ProjectsModule),
      },
    ],
  },
  {
    path: 'auth',
    component: AuthLayoutComponent,
    children: [
      { path: '',         redirectTo: 'login', pathMatch: 'full' },
      { path: 'login',    component: LoginComponent },
      { path: 'register', component: RegisterComponent },
      { path: 'registration-success', component: RegistrationSuccessComponent },
      { path: 'activate', component: ActivateAccountComponent },
    ],
  },
  { path: 'register', redirectTo: 'auth/register', pathMatch: 'full' },
  { path: '**',       redirectTo: 'dashboard' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule],
})
export class RoutesRoutingModule {}