// src/app/routes/users/users-routing.module.ts
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { UsersComponent } from './users.component';
import { ViewComponent } from './view/view.component';      // ← Corrigé: ViewComponent
import { EditComponent } from './edit/edit.component';      // ← Corrigé: EditComponent

const routes: Routes = [
  { path: '', component: UsersComponent },
  { path: ':id', component: ViewComponent },                
  { path: ':id/edit', component: EditComponent }            
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UsersRoutingModule { }