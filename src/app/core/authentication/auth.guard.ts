// src/app/core/authentication/auth.guard.ts
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard = (route?: ActivatedRouteSnapshot, state?: RouterStateSnapshot): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);

  console.log('🔐 AuthGuard - Checking authentication');
  
  if (auth.check()) {
    console.log('✅ AuthGuard - User is authenticated');
    return true;
  } else {
    console.log('❌ AuthGuard - User is NOT authenticated, redirecting to login');
    
    // Stocker l'URL tentée pour redirection après login (optionnel)
    if (state) {
      localStorage.setItem('redirectUrl', state.url);
    }
    
    return router.parseUrl('/auth/login');
  }
};