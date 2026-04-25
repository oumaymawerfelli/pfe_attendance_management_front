// attendance.module.ts - Make sure this is correct
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { SharedModule } from '@shared/shared.module';
import { AttendanceRoutingModule } from './attendance-routing.module';

import { AttendanceHistoryComponent } from './components/history/attendance-history.component';
import { MissedCheckoutDialogComponent } from './components/missed-checkout-dialog/missed-checkout-dialog.component';
import { OvertimeDialogComponent } from './components/overtime-dialog/overtime-dialog.component';
import { AllEmployeesAttendanceComponent } from './components/all-employees/all-employees-attendance/all-employees-attendance.component';
import { AttendanceSummaryComponent } from './components/dashboard/attendance-summary.component';
import { DayDetailDialogComponent } from './components/day-detail-dialog/day-detail-dialog.component';

@NgModule({
  imports: [
    CommonModule,

    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatButtonModule,
    MatDialogModule,
    NgxChartsModule,
    SharedModule,
    AttendanceRoutingModule,
  ],
  declarations: [
    AttendanceHistoryComponent,
    MissedCheckoutDialogComponent,
    OvertimeDialogComponent,
    AllEmployeesAttendanceComponent,
    AttendanceSummaryComponent,
    DayDetailDialogComponent,
  ],
})
export class AttendanceModule {}
