import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Component } from '@angular/core';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpRequest } from '@angular/common/http';
import { skip } from 'rxjs/operators';
import { LocalStorageService, MemoryStorageService } from '@shared/services/storage.service';
import { AuthService, LoginService, TokenService } from '@core/authentication';
import { of } from 'rxjs';
@Component({ template: '' })
class DummyComponent {}

// ✅ JWT minimal valide (exp dans le futur)
function makeJwt(expiresInSeconds = 3600): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub: '1',
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    })
  );
  return `${header}.${payload}.fake-sig`;
}

describe('AuthService', () => {
  let authService: AuthService;
  let loginService: LoginService;
  let tokenService: TokenService;
  let httpMock: HttpTestingController;

  const email = 'foo@bar.com';
  const user = { id: 1, email };

  // ✅ Tokens avec access_token JWT valide
  const token = { access_token: makeJwt(3600), token_type: 'bearer', expires_in: 3600 };
  const shortToken = { access_token: makeJwt(5), token_type: 'bearer', expires_in: 5 };

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DummyComponent],
      imports: [
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([
          { path: 'auth/login', component: DummyComponent },
          { path: '**', component: DummyComponent },
        ]),
      ],
      providers: [{ provide: LocalStorageService, useClass: MemoryStorageService }],
    });

    authService = TestBed.inject(AuthService);
    loginService = TestBed.inject(LoginService);
    tokenService = TestBed.inject(TokenService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // ✅ Flush toutes les requêtes encore ouvertes avant verify()
    //    Évite les Uncaught HttpErrorResponse après la fin du test
    httpMock
      .match(() => true)
      .forEach(req => {
        if (!req.cancelled) req.flush({});
      });
    tokenService.clear();
    httpMock.verify();
  });

  it('should be created', () => {
    expect(authService).toBeTruthy();
  });

  it('should log in failed', () => {
    authService.login(email, 'password', false).subscribe(isLogin => expect(isLogin).toBeFalse());

    httpMock
      .expectOne(req => req.url.includes('auth/login'))
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    httpMock.expectNone('/api/auth/me');
    expect(authService.check()).toBeFalse();
  });

  it('should log in successful and get user info', () => {
    const changeSub = authService.change().subscribe();

    // ✅ Garder une référence pour unsubscribe avant afterEach
    const userSub = authService
      .user()
      .pipe(skip(1))
      .subscribe({
        next: u => expect(u.id).toEqual(user.id),
        error: () => {},
      });

    authService.login(email, 'password', false).subscribe({
      next: isLogin => expect(isLogin).toBeTrue(),
      error: () => fail('should not error'),
    });

    httpMock
      .expectOne(req => req.url.includes('auth/login'))
      .flush({
        token: makeJwt(3600),
        tokenType: 'bearer',
        expiresIn: 3600,
        user,
      });

    httpMock.expectOne('/api/auth/me').flush(user);
    expect(authService.check()).toBeTrue();

    // ✅ Désabonner avant que afterEach ne flush {} sur les requêtes ouvertes
    userSub.unsubscribe();
    changeSub.unsubscribe();
  });
  it('should log out user', () => {
    spyOn(loginService, 'logout').and.returnValue(of({}));

    authService.change().subscribe();
    tokenService.set(token);
    httpMock.expectOne('/api/auth/me').flush(user);

    authService.logout().subscribe();
    httpMock.expectOne(req => req.url.includes('attendance/logout-checkout')).flush({});

    expect(loginService.logout).toHaveBeenCalled();
    expect(authService.check()).toBeFalse();
  });

  it('should refresh token when access_token is valid', fakeAsync(() => {
    authService.change().subscribe();
    tokenService.set(shortToken);
    httpMock.expectOne('/api/auth/me').flush(user);

    tick(4000);
    httpMock
      .match(
        (req: HttpRequest<any>) => req.url === '/api/auth/refresh' && !req.body?.refresh_token
      )[0]
      ?.flush(token);

    expect(authService.check()).toBeTrue();
    // ✅ ngOnDestroy ici uniquement — stoppe le timer interne du TokenService
    tokenService.ngOnDestroy();
  }));

  it('should refresh token when access_token expired and refresh_token valid', fakeAsync(() => {
    authService.change().subscribe();
    tokenService.set({ ...shortToken, refresh_token: 'foo' });
    httpMock.expectOne('/api/auth/me').flush(user);

    tick(10000);
    httpMock
      .match(
        (req: HttpRequest<any>) =>
          req.url === '/api/auth/refresh' && req.body?.refresh_token === 'foo'
      )[0]
      ?.flush(token);

    expect(authService.check()).toBeTrue();
    tokenService.ngOnDestroy();
  }));

  it('should clear token when refresh returns 401', fakeAsync(() => {
    spyOn(tokenService, 'set').and.callThrough();
    authService.change().subscribe();

    tokenService.set({ ...shortToken, refresh_token: 'foo' });
    httpMock.expectOne('/api/auth/me').flush(user);

    tick(10000);
    httpMock
      .match(
        (req: HttpRequest<any>) =>
          req.url === '/api/auth/refresh' && req.body?.refresh_token === 'foo'
      )[0]
      ?.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authService.check()).toBeFalse();
    expect(tokenService.set).toHaveBeenCalledWith(undefined);
    tokenService.ngOnDestroy();
  }));

  it('should call /me only once when subscribed twice', () => {
    authService.change().subscribe();
    authService.change().subscribe();

    tokenService.set(token);
    // ✅ shareReplay(1) → un seul appel /me même avec 2 subscribers
    httpMock.expectOne('/api/auth/me').flush(user);

    expect(authService.check()).toBeTrue();
  });
});
