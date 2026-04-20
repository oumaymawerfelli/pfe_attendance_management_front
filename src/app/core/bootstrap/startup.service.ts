// src/app/core/bootstrap/startup.service.ts
import { Injectable } from '@angular/core';
import { AuthService, User } from '@core/authentication';
import { NgxPermissionsService, NgxRolesService } from 'ngx-permissions';
import { switchMap, tap } from 'rxjs/operators';
import { Menu, MenuService } from './menu.service';

@Injectable({
  providedIn: 'root',
})
export class StartupService {
  constructor(
    private authService: AuthService,
    private menuService: MenuService,
    private permissonsService: NgxPermissionsService,
    private rolesService: NgxRolesService
  ) {}

  load() {
    return new Promise<void>(resolve => {
      const publicPaths = [
        '/auth/activate',
        '/auth/login',
        '/auth/register',
        '/auth/registration-success',
      ];
      const isPublicPath = publicPaths.some(path => window.location.pathname.startsWith(path));

      this.authService
        .change()
        .pipe(
          tap(user => this.setPermissions(user)),
          switchMap(() => this.authService.menu()),
          tap((menu: Menu[]) => this.setMenu(menu))
        )
        .subscribe({
          next: () => resolve(),
          error: err => {
            console.error('❌ Error loading menu:', err);
            this.setMenu([]);
            resolve();
          },
        });

      if (isPublicPath) {
        resolve();
      }
    });
  }

  private setMenu(menu: Menu[]) {
    this.menuService.addNamespace(menu, 'menu');
    this.menuService.set(menu);
  }

  private setPermissions(user: User) {
    const permissions = ['canAdd', 'canDelete', 'canEdit', 'canRead'];
    this.permissonsService.loadPermissions(permissions);
    this.rolesService.flushRoles();
    if (user?.roles) {
      const roles = Array.isArray(user.roles) ? user.roles : [user.roles];
      roles.forEach(role => {
        if (role) this.rolesService.addRole(role, permissions);
      });
    }
  }
}
