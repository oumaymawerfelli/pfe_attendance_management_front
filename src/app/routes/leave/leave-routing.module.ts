import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LeavePageComponent } from './components/leave-page/leave-page.component';
import { AdminLeavesComponent } from './components/admin-leaves/admin-leaves.component';

const routes: Routes = [
  { path: '', component: LeavePageComponent },
  { path: 'all', component: AdminLeavesComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LeaveRoutingModule {}
