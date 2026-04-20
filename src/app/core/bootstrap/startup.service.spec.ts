import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NgxPermissionsModule, NgxPermissionsService, NgxRolesService } from 'ngx-permissions';
import { LocalStorageService, MemoryStorageService } from '@shared/services/storage.service';
import { admin, TokenService } from '@core/authentication';
import { MenuService } from '@core/bootstrap/menu.service';
import { StartupService } from '@core/bootstrap/startup.service';

function makeValidToken(): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub: '1',
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
  );
  return `${header}.${payload}.signature`;
}

describe('StartupService', () => {
  let httpMock: HttpTestingController;
  let startup: StartupService;
  let tokenService: TokenService;
  let menuService: MenuService;
  let mockPermissionsService: NgxPermissionsService;
  let mockRolesService: NgxRolesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, NgxPermissionsModule.forRoot()],
      providers: [
        { provide: LocalStorageService, useClass: MemoryStorageService },
        {
          provide: NgxPermissionsService,
          useValue: { loadPermissions: (_: string[]) => void 0 },
        },
        {
          provide: NgxRolesService,
          useValue: {
            flushRoles: () => void 0,
            addRoles: (_: { ADMIN: string[] }) => void 0,
          },
        },
        // ✅ Mock MenuService pour éviter le menu hardcodé par défaut
        {
          provide: MenuService,
          useValue: {
            addNamespace: jasmine.createSpy('addNamespace'),
            set: jasmine.createSpy('set'),
          },
        },
        StartupService,
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    startup = TestBed.inject(StartupService);
    tokenService = TestBed.inject(TokenService);
    menuService = TestBed.inject(MenuService);
    mockPermissionsService = TestBed.inject(NgxPermissionsService);
    mockRolesService = TestBed.inject(NgxRolesService);
  });

  afterEach(() => {
    httpMock.match(() => true).forEach(req => req.flush({}));
    httpMock.verify();
  });

  it('should load menu when token is valid', async () => {
    const menuData = { menu: [] };
    // ✅ Pas besoin de spyOn — les spies sont déjà dans le mock du provider
    spyOn(mockPermissionsService, 'loadPermissions');
    spyOn(mockRolesService, 'flushRoles');
    spyOn(mockRolesService, 'addRoles');

    tokenService.set({ access_token: makeValidToken(), token_type: 'bearer' });

    const loadPromise = startup.load();

    httpMock.expectOne('/api/auth/me').flush(admin);
    httpMock.expectOne('/api/auth/me/menu').flush(menuData);

    await loadPromise;

    expect(menuService.addNamespace).toHaveBeenCalledWith(menuData.menu, 'menu');
    expect(menuService.set).toHaveBeenCalledWith(menuData.menu);
  });

  it('should clear menu when no token is set', async () => {
    await startup.load();

    httpMock.expectNone('/api/auth/me');
    httpMock.expectNone('/api/auth/me/menu');

    expect(menuService.addNamespace).toHaveBeenCalledWith([], 'menu');
    expect(menuService.set).toHaveBeenCalledWith([]);
  });
});
