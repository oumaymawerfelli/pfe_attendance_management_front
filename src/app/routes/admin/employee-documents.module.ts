// routes/employee-documents/employee-documents.module.ts

import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { ReactiveFormsModule }  from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { MatTableModule }       from '@angular/material/table';
import { MatPaginatorModule }   from '@angular/material/paginator';
import { MatSortModule }        from '@angular/material/sort';
import { MatFormFieldModule }   from '@angular/material/form-field';
import { MatInputModule }       from '@angular/material/input';
import { MatSelectModule }      from '@angular/material/select';
import { MatDatepickerModule }  from '@angular/material/datepicker';
import { MatNativeDateModule }  from '@angular/material/core';
import { MatButtonModule }      from '@angular/material/button';
import { MatIconModule }        from '@angular/material/icon';
import { MatTooltipModule }     from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { EmployeeDocumentsComponent } from './employee-documents/employee-documents.component'; // ← ./employee-documents/

const routes: Routes = [
  { path: '', component: EmployeeDocumentsComponent }
];

@NgModule({
  declarations: [EmployeeDocumentsComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressBarModule,
     MatCheckboxModule,
  ],
})
export class EmployeeDocumentsModule {}