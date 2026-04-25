// src/app/core/constants.ts
import { InjectionToken, Provider } from '@angular/core';
import { APP_INITIALIZER } from '@angular/core';
import { StartupService } from '../bootstrap/startup.service';

export const BASE_URL = new InjectionToken<string>('BASE_URL');

// ← SUPPRIMER httpInterceptorProviders d'ici, elle est dans interceptors/index.ts

export const appInitializerProviders: Provider[] = [
  {
    provide: APP_INITIALIZER,
    useFactory: (startup: StartupService) => () => startup.load(),
    deps: [StartupService],
    multi: true,
  },
];
