import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Single guard that handles both:
 *  1. Authentication  — is the user logged in?
 *  2. Authorization   — does the user have the required role(s)?
 *
 * Usage in routes:
 *
 *   // Any logged-in user
 *   { path: 'my-attendance', canActivate: [authGuard] }
 *
 *   // Only PROJECT_MANAGER
 *   { path: 'team-attendance', canActivate: [authGuard], data: { roles: ['PROJECT_MANAGER'] } }
 *
 *   // GENERAL_MANAGER or ADMIN
 *   { path: 'all-attendance', canActivate: [authGuard], data: { roles: ['GENERAL_MANAGER', 'ADMIN'] } }
 */
export const authGuard = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Observable<boolean | UrlTree> | boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // ── Step 1: is the user logged in? ────────────────────────────────────────
  if (!auth.check()) {
    console.log('❌ AuthGuard — not authenticated, redirecting to login');
    localStorage.setItem('redirectUrl', state.url);
    return router.parseUrl('/auth/login');
  }

  // ── Step 2: are roles required for this route? ─────────────────────────────
  const requiredRoles: string[] = route.data?.roles ?? [];

  // No role restriction → let the user through
  if (requiredRoles.length === 0) {
    console.log('✅ AuthGuard — authenticated, no role restriction');
    return true;
  }

  // ── Step 3: does the user have one of the required roles? ─────────────────
  return auth.user().pipe(
    take(1),
    map(user => {
      // Roles from backend: [{ id: 1, name: 'PROJECT_MANAGER', description: '...' }]
      const userRoles: string[] = (user?.roles ?? []).map((r: any) =>
        typeof r === 'string' ? r : r?.name ?? ''
      );

      const allowed = requiredRoles.some(role => userRoles.includes(role));

      if (allowed) {
        console.log(`✅ AuthGuard — role check passed [${userRoles.join(', ')}]`);
        return true;
      }

      console.warn(
        `❌ AuthGuard — user has [${userRoles.join(', ')}] but needs [${requiredRoles.join(', ')}]`
      );
      return router.parseUrl('/403');
    })
  );
};

// ── Helper functions — use these inside components to show/hide UI ────────────

/** True if the user has the given role. */
export function hasRole(user: any, role: string): boolean {
  return (user?.roles ?? []).some((r: any) => {
    const name = typeof r === 'string' ? r : r?.name ?? '';
    return name.replace(/^ROLE_/, '') === role;
  });
}

/** True if the user has ANY of the given roles. */
export function hasAnyRole(user: any, ...roles: string[]): boolean {
  return roles.some(role => hasRole(user, role));
}

/** Returns the highest-priority role of the user. */
export function getPrimaryRole(user: any): string {
  const priority = ['ADMIN', 'GENERAL_MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE'];
  return priority.find(role => hasRole(user, role)) ?? 'EMPLOYEE';
}
