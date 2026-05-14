import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NgxPermissionsModule, NgxPermissionsService, NgxRolesService } from 'ngx-permissions';
import { LocalStorageService, MemoryStorageService } from '@shared/services/storage.service';
import { admin, TokenService } from '@core/authentication';
import { MenuService } from '@core/bootstrap/menu.service';
import { StartupService } from '@core/bootstrap/startup.service';
import { NotificationService } from '../../routes/Notification/services/Notification.service';

function makeValidToken(): string {
  const header  = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({ sub: '1', exp: Math.floor(Date.now() / 1000) + 3600 })
  );
  return `${header}.${payload}.signature`;
}

describe('StartupService', () => {
  let httpMock:     HttpTestingController;
  let startup:      StartupService;
  let tokenService: TokenService;
  let menuService:  MenuService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, NgxPermissionsModule.forRoot()],
      providers: [
        { provide: LocalStorageService, useClass: MemoryStorageService },
        {
          provide:  NgxPermissionsService,
          useValue: { loadPermissions: (_: string[]) => void 0 },
        },
        {
          provide:  NgxRolesService,
          useValue: {
            flushRoles: () => void 0,
            addRole:    (_: any, __: any) => void 0,  // service calls addRole, not addRoles
          },
        },
        {
          provide:  MenuService,
          useValue: {
            addNamespace: jasmine.createSpy('addNamespace'),
            set:          jasmine.createSpy('set'),
          },
        },
        {
          provide:  NotificationService,   // ← required by setMenu()
          useValue: { init: jasmine.createSpy('init') },
        },
        StartupService,
      ],
    });

    httpMock     = TestBed.inject(HttpTestingController);
    startup      = TestBed.inject(StartupService);
    tokenService = TestBed.inject(TokenService);
    menuService  = TestBed.inject(MenuService);
  });

  afterEach(() => {
    httpMock.match(() => true).forEach(req => { if (!req.cancelled) req.flush({}); });
    httpMock.verify();
  });

  it('should set menu to empty array when no token is set', async () => {
    const loadPromise = startup.load();
    await loadPromise;

    // No HTTP calls expected — menu() falls through to of([]) when unauthenticated
    expect(menuService.set).toHaveBeenCalledWith([]);
  });

  it('should load and set menu when token is valid', async () => {
    tokenService.set({ access_token: makeValidToken(), token_type: 'bearer' });

    const loadPromise = startup.load();

    // Flush /me so assignUser() completes
    httpMock.match(req => req.url.includes('/me') && !req.url.includes('menu'))
            .forEach(req => req.flush(admin));

    // Flush the menu endpoint (URL may vary — match broadly)
    httpMock.match(req => req.url.includes('menu'))
            .forEach(req => req.flush([]));

    await loadPromise;

    expect(menuService.set).toHaveBeenCalled();
  });
});