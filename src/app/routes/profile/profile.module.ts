import { NgModule } from '@angular/core';
import { SharedModule } from '@shared/shared.module';
import { ProfileRoutingModule } from './profile-routing.module';

import { ProfileLayoutComponent } from './layout/layout.component';
import { ProfileOverviewComponent } from './overview/overview.component';

import { EditProfileDialogComponent } from './edit-profile-dialog/edit-profile-dialog.component';
import { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';



const COMPONENTS: any[] = [
  ProfileLayoutComponent,
  ProfileOverviewComponent,
  
  EditProfileDialogComponent,
  ConfirmDialogComponent,

];
const COMPONENTS_DYNAMIC: any[] = [];

@NgModule({
  imports: [SharedModule, ProfileRoutingModule],
  declarations: [...COMPONENTS, ...COMPONENTS_DYNAMIC],
})
export class ProfileModule {}
