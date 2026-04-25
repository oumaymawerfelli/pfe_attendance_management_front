import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, iif, merge, of } from 'rxjs';
import { catchError, filter, map, share, switchMap, take, tap } from 'rxjs/operators';
import { filterObject, isEmptyObject } from './helpers';
import { User } from './interface';
import { LoginService } from './login.service';
import { TokenService } from './token.service';
import { UserService } from '../services/user.service';
import { environment } from '@env/environment';
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private user$ = new BehaviorSubject<User>({});
  private change$ = merge(
    this.tokenService.change(),
    this.tokenService.refresh().pipe(switchMap(() => this.refresh()))
  ).pipe(
    switchMap(() => this.assignUser()),
    share()
  );

  constructor(
    private loginService: LoginService,
    private tokenService: TokenService,
    private userService: UserService,
    private http: HttpClient // ← injected to call attendance endpoint
  ) {}

  init() {
    return new Promise<void>(resolve =>
      this.change$
        .pipe(
          switchMap(() => this.user$.pipe(filter(user => !isEmptyObject(user) || !this.check()))),
          take(1)
        )
        .subscribe(() => resolve())
    );
  }

  change() {
    return this.change$;
  }

  check() {
    return this.tokenService.valid();
  }

  login(username: string, password: string, rememberMe = false) {
    return this.loginService.login(username, password, rememberMe).pipe(
      tap(token => this.tokenService.set(token)),
      map(() => this.check()),
      catchError(() => of(false))
    );
  }

  refresh() {
    return this.loginService
      .refresh(filterObject({ refresh_token: this.tokenService.getRefreshToken() }))
      .pipe(
        catchError(() => of(undefined)),
        tap(token => this.tokenService.set(token)),
        map(() => this.check())
      );
  }

  logout() {
    // ── Step 1: record checkout BEFORE the token is cleared ──────────────
    // If the call fails (e.g. already checked out, weekend) we still
    // continue with the normal logout — catchError guarantees this.
    return this.http.post(`${environment.apiUrl}/attendance/logout-checkout`, {}).pipe(
      catchError(() => of(null)), // never block logout on attendance errors

      // ── Step 2: standard logout (invalidate token on the backend) ──────
      switchMap(() => this.loginService.logout()),

      // ── Step 3: clear everything locally ──────────────────────────────
      tap(() => {
        this.tokenService.clear();
        localStorage.removeItem('currentUser');
        this.userService.setUser(null); // ← add this if UserService stores the user
        this.user$.next({});
      }),

      map(() => !this.check())
    );
  }

  user() {
    return this.user$.pipe(share());
  }

  menu() {
    return iif(() => this.check(), this.loginService.menu(), of([]));
  }

  private assignUser() {
    if (!this.check()) {
      return of({}).pipe(tap(user => this.user$.next(user)));
    }

    // ── Remove the cache check entirely — always fetch fresh from /me ──────
    return this.loginService.me().pipe(
      tap(user => {
        console.log('🔍 /me response:', JSON.stringify(user)); // ← add this
        this.user$.next(user);
        this.userService.setUser(user);
      }),
      catchError(() => {
        // Only fall back to cache if /me itself fails (network error etc.)
        const stored = localStorage.getItem('currentUser');
        if (stored) {
          const user = JSON.parse(stored);
          this.user$.next(user);
          return of(user);
        }
        return of({}).pipe(tap(u => this.user$.next(u)));
      })
    );
  }
}
