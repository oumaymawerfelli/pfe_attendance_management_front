import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { DragDropModule } from '@angular/cdk/drag-drop';

import { MaterialModule } from '../material.module';
import { MaterialExtensionsModule } from '../material-extensions.module';

import { MatMenuModule }        from '@angular/material/menu';
import { MatDatepickerModule }  from '@angular/material/datepicker';
import { MatNativeDateModule }  from '@angular/material/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxModule }    from '@angular/material/checkbox';
import { MatStepperModule }     from '@angular/material/stepper';

import { FormlyModule } from '@ngx-formly/core';
import { FormlyMaterialModule } from '@ngx-formly/material';
import { NgProgressModule } from 'ngx-progressbar';
import { NgProgressHttpModule } from 'ngx-progressbar/http';
import { NgProgressRouterModule } from 'ngx-progressbar/router';
import { NgxPermissionsModule } from 'ngx-permissions';
import { ToastrModule } from 'ngx-toastr';
import { TranslateModule } from '@ngx-translate/core';

import { BreadcrumbComponent } from './components/breadcrumb/breadcrumb.component';
import { PageHeaderComponent } from './components/page-header/page-header.component';
import { ErrorCodeComponent } from './components/error-code/error-code.component';
import { DisableControlDirective } from './directives/disable-control.directive';
import { SafeUrlPipe } from './pipes/safe-url.pipe';
import { ToObservablePipe } from './pipes/to-observable.pipe';

const MODULES: any[] = [
  CommonModule,
  RouterModule,
  ReactiveFormsModule,
  FormsModule,
  DragDropModule,
  MaterialModule,
  MaterialExtensionsModule,
  MatMenuModule,          // ← was imported but missing from array
  MatDatepickerModule,    // ← was imported but missing from array
  MatNativeDateModule,    // ← was imported but missing from array
  MatSlideToggleModule,   // ← new: fixes mat-slide-toggle in register
  MatCheckboxModule,      // ← new: fixes mat-checkbox in register
  MatStepperModule,       // ← new: fixes mat-step in register
  FormlyModule,
  FormlyMaterialModule,
  NgProgressModule,
  NgProgressRouterModule,
  NgProgressHttpModule,
  NgxPermissionsModule,
  ToastrModule,
  TranslateModule,
];

const COMPONENTS: any[]         = [BreadcrumbComponent, PageHeaderComponent, ErrorCodeComponent];
const COMPONENTS_DYNAMIC: any[] = [];
const DIRECTIVES: any[]         = [DisableControlDirective];
const PIPES: any[]              = [SafeUrlPipe, ToObservablePipe];

@NgModule({
  imports:      [...MODULES],
  exports:      [...MODULES, ...COMPONENTS, ...DIRECTIVES, ...PIPES],
  declarations: [...COMPONENTS, ...COMPONENTS_DYNAMIC, ...DIRECTIVES, ...PIPES],
})
export class SharedModule {}