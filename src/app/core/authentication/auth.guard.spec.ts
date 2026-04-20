import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Component } from '@angular/core';
import { of } from 'rxjs';
import { AuthService, authGuard } from '@core/authentication';

@Component({ template: '' })
class DummyComponent {}

describe('authGuard function unit test', () => {
  const route: any = {};
  const state: any = { url: '/dashboard' };

  let router: Router;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    // 1. Créer le mock AVANT configureTestingModule
    mockAuthService = jasmine.createSpyObj('AuthService', ['check', 'user']);
    mockAuthService.user.and.returnValue(of({ id: 1, roles: [] }));

    TestBed.configureTestingModule({
      declarations: [DummyComponent],
      imports: [
        // Plus besoin de HttpClientTestingModule — aucun vrai service HTTP
        RouterTestingModule.withRoutes([
          { path: 'dashboard', component: DummyComponent, canActivate: [authGuard] },
          { path: 'auth/login', component: DummyComponent },
          { path: '403', component: DummyComponent },
          { path: '**', component: DummyComponent },
        ]),
      ],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    });

    router = TestBed.inject(Router);
  });

  it('should return true when authenticated with no role restriction', () => {
    mockAuthService.check.and.returnValue(true);
    route.data = {};

    const result = TestBed.runInInjectionContext(() => authGuard(route, state));
    expect(result).toBeTrue();
  });

  it('should redirect to /auth/login when not authenticated', () => {
    mockAuthService.check.and.returnValue(false);

    const result = TestBed.runInInjectionContext(() => authGuard(route, state));
    expect(result).toEqual(router.parseUrl('/auth/login'));
  });

  it('should return true when user has required role', done => {
    mockAuthService.check.and.returnValue(true);
    mockAuthService.user.and.returnValue(
      of({ id: 1, roles: [{ name: 'PROJECT_MANAGER' }] } as any)
    );
    route.data = { roles: ['PROJECT_MANAGER'] };

    const result = TestBed.runInInjectionContext(() => authGuard(route, state)) as any;
    result.subscribe((val: any) => {
      expect(val).toBeTrue();
      done();
    });
  });

  it('should redirect to /403 when user lacks required role', done => {
    mockAuthService.check.and.returnValue(true);
    mockAuthService.user.and.returnValue(of({ id: 1, roles: [{ name: 'EMPLOYEE' }] } as any));
    route.data = { roles: ['ADMIN'] };

    const result = TestBed.runInInjectionContext(() => authGuard(route, state)) as any;
    result.subscribe((val: any) => {
      expect(val).toEqual(router.parseUrl('/403'));
      done();
    });
  });
});
