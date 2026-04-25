// src/app/core/index.ts

// =====================
// AUTHENTICATION
// =====================
export * from './authentication/register-request';
export * from './authentication/auth.guard';
export * from './authentication/auth.service';
export * from './authentication/token-factory.service';
export * from './authentication/token.service';
export * from './authentication/token';
export * from './authentication/login.service';
export * from './authentication/user';
export * from './authentication/helpers';

// Export only types
export type { User, Token } from './authentication/interface';

// =====================
// BOOTSTRAP
// =====================
export * from './bootstrap/menu.service';
export * from './bootstrap/startup.service';
export * from './bootstrap/translate-lang.service';
export * from './bootstrap/preloader.service';
export * from './bootstrap/sanctum.service';

// =====================
// SETTINGS
// =====================
export * from './settings/settings.service';
export * from './settings/settings';

// =====================
// CONSTANTS
// =====================
export * from './constants'; // BASE_URL etc.

// =====================
// INTERCEPTORS
// =====================
export {
  BaseUrlInterceptor,
  DefaultInterceptor,
  ErrorInterceptor,
  LoggingInterceptor,
  NoopInterceptor,
  SettingsInterceptor,
  TokenInterceptor,
  httpInterceptorProviders, // ✅ IMPORTANT
} from './interceptors';

// =====================
// MODULE GUARD
// =====================
export * from './module-import-guard';
