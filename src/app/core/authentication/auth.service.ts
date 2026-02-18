import { Injectable } from '@angular/core';
import { BehaviorSubject, iif, merge, of } from 'rxjs';
import { catchError, map, share, switchMap, tap } from 'rxjs/operators';
import { filterObject, isEmptyObject } from './helpers';
import { User } from './interface';
import { LoginService } from './login.service';
import { TokenService } from './token.service';
import { UserService } from '../services/user.service';
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
    private userService: UserService
  ) {}

  init() {
    return new Promise<void>(resolve => this.change$.subscribe(() => resolve()));
  }

  change() {
    return this.change$;
  }

  check() {
    return this.tokenService.valid();
  }

  login(username: string, password: string, rememberMe = false) {
    return this.loginService.login(username, password, rememberMe).pipe(
      tap(token => {
        this.tokenService.set(token);
      }),
      map(() => this.check())
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
    return this.loginService.logout().pipe(
      tap(() => {
        this.tokenService.clear();
        localStorage.removeItem('currentUser');
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

    if (!isEmptyObject(this.user$.getValue())) {
      return of(this.user$.getValue());
    }

    return this.loginService.me().pipe(
      tap(user => {
        console.log(' Utilisateur chargé depuis /me:', user);
        console.log(' Rôles bruts:', user.roles);
        console.log('Type des rôles:', typeof user.roles);
        console.log('Est un tableau?', Array.isArray(user.roles));
        if (Array.isArray(user.roles) && user.roles.length > 0) {
          console.log(' Premier rôle:', user.roles[0]);
        }
        this.user$.next(user);
        this.userService.setUser(user);
      }),
      catchError(error => {
        console.error(' Erreur chargement utilisateur:', error);
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          this.user$.next(user);
          return of(user);
        }
        return of({}).pipe(tap(user => this.user$.next(user)));
      })
    );
  }
}
