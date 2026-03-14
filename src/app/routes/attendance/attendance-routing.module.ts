import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AttendanceDashboardComponent } from './components/dashboard/attendance-dashboard.component';
import { AttendanceHistoryComponent } from './components/history/attendance-history.component';

const routes: Routes = [
  { path: '',          redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: AttendanceDashboardComponent    },
  { path: 'history',   component: AttendanceHistoryComponent      },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AttendanceRoutingModule {}