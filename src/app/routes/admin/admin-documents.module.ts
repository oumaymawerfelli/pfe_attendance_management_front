// routes/admin/admin-documents.module.ts

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
import { MatChipsModule }       from '@angular/material/chips';
import { MatTooltipModule }     from '@angular/material/tooltip';
import { MatDialogModule }      from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatMenuModule }        from '@angular/material/menu';
import { MatDividerModule }     from '@angular/material/divider';
import { MatCardModule }        from '@angular/material/card';

import { AdminDocumentsComponent } from './admin-documents/admin-documents.component'; // ← ./admin-documents/
import { ReviewDialogComponent }   from './review-dialog/review-dialog.component';     // ← ./review-dialog/

const routes: Routes = [
  { path: '', component: AdminDocumentsComponent }
];

@NgModule({
  declarations: [
    AdminDocumentsComponent,
    ReviewDialogComponent,
  ],
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
    MatChipsModule,
    MatTooltipModule,
    MatDialogModule,
    MatProgressBarModule,
    MatMenuModule,
    MatDividerModule,
    MatCardModule,
  ],
})
export class AdminDocumentsModule {}