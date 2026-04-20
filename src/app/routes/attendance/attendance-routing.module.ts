import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AttendanceSummaryComponent } from './components/dashboard/attendance-summary.component';
import { AttendanceHistoryComponent } from './components/history/attendance-history.component';
import { AllEmployeesAttendanceComponent } from './components/all-employees/all-employees-attendance/all-employees-attendance.component';

const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  { path: 'history', component: AttendanceHistoryComponent },
  { path: 'all', component: AllEmployeesAttendanceComponent },
  { path: 'summary', component: AttendanceSummaryComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AttendanceRoutingModule {}
