// src/app/core/core.module.ts
import { NgModule, Optional, SkipSelf } from '@angular/core';
import { CommonModule } from '@angular/common';
import { throwIfAlreadyLoaded } from './module-import-guard';
import { httpInterceptorProviders } from './interceptors'; // ← IMPORTER LES INTERCEPTEURS

@NgModule({
  declarations: [],
  imports: [CommonModule],
  providers: [
    httpInterceptorProviders, // ← AJOUTER LES INTERCEPTEURS ICI
  ],
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
    throwIfAlreadyLoaded(parentModule, 'CoreModule');
  }
}
