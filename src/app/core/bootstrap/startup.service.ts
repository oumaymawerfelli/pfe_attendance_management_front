// src/app/core/bootstrap/startup.service.ts
import { Injectable } from '@angular/core';
import { AuthService, User } from '@core/authentication';
import { NgxPermissionsService, NgxRolesService } from 'ngx-permissions';
import { switchMap, tap } from 'rxjs/operators';
import { Menu, MenuService } from './menu.service';
import { NotificationService } from '../../routes/Notification/services/Notification.service';

@Injectable({
  providedIn: 'root',
})
export class StartupService {
  private currentUser: User | null = null;

  constructor(
    private authService:         AuthService,
    private menuService:          MenuService,
    private permissonsService:    NgxPermissionsService,
    private rolesService:         NgxRolesService,
    private notificationService:  NotificationService,
  ) {}

  load() {
    return new Promise<void>(resolve => {
      const publicPaths = [
        '/auth/activate',
        '/auth/login',
        '/auth/register',
        '/auth/registration-success',
      ];
      const isPublicPath = publicPaths.some(path =>
        window.location.pathname.startsWith(path)
      );

      this.authService
        .change()
        .pipe(
          tap(user => this.setPermissions(user)),
          switchMap(() => this.authService.menu()),
          tap((menu: Menu[]) => this.setMenu(menu))
        )
        .subscribe({
          next:  () => resolve(),
          error: err => {
            console.error('❌ Error loading menu:', err);
            this.setMenu([]);
            resolve();
          },
        });

      if (isPublicPath) resolve();
    });
  }

  private setMenu(menu: Menu[]) {
    if (!menu || !Array.isArray(menu)) {
      this.menuService.set([]);
      return;
    }

    // ── Remove notifications from sidebar ─────────────
    menu = menu.filter(item =>
      !['notifications', 'notification'].includes((item.route ?? '').toLowerCase())
    );

    // ✅ FORCE icons on AI submenu children
    menu.forEach(item => {
      if (item.route === 'ai' && item.children) {
        item.children.forEach(child => {
          if (child.route === 'rag') child.icon = 'smart_toy';
          if (child.route === 'demotivation') child.icon = 'insights';
        });
      }
    });

    const userRoles: string[] = (this.currentUser?.roles ?? []).map((r: any) =>
      (typeof r === 'string' ? r : r.name?.name ?? r.name ?? '').replace(/^ROLE_/, '')
    );

    const canSeeDocuments = userRoles.some(r =>
      ['ADMIN', 'GENERAL_MANAGER', 'PROJECT_MANAGER'].includes(r)
    );

    if (canSeeDocuments) {
      menu.push({
        route: 'admin/documents',
        name:  'Leave Documents',
        type:  'link',
        icon:  'folder_open',
      });
    }

    menu.push({
      route: 'my-documents',
      name:  'My Documents',
      type:  'link',
      icon:  'description',
    });

    this.menuService.set(menu);
    this.notificationService.init();
  }

  private setPermissions(user: User) {
    this.currentUser = user;
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