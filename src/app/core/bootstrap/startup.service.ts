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
    return new Promise<void>((resolve) => {
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
          tap(user => {
            this.setPermissions(user);
          }),
          switchMap(() => this.authService.menu()),
          tap((menu: Menu[]) => {
            let currentUser: User | null = null;
            this.authService.user().subscribe(user => currentUser = user).unsubscribe();

            const enhancedMenu = this.buildMenuBasedOnRole(menu, currentUser);
            this.setMenu(enhancedMenu);
          })
        )
        .subscribe({
          next: () => resolve(),
          error: (err) => {
            console.error('❌ Error loading menu:', err);
            let currentUser: User | null = null;
            this.authService.user().subscribe(user => currentUser = user).unsubscribe();

            const defaultMenu = this.getDefaultMenuForRole(currentUser);
            this.setMenu(defaultMenu);
            resolve();
          },
        });

      if (isPublicPath) {
        resolve();
      }
    });
  }

  private setMenu(menu: Menu[]) {
    this.menuService.set(menu);
  }

  private setPermissions(user: User) {
    const permissions = ['canAdd', 'canDelete', 'canEdit', 'canRead'];
    this.permissonsService.loadPermissions(permissions);
    this.rolesService.flushRoles();

    if (user?.roles) {
      const roles = Array.isArray(user.roles) ? user.roles : [user.roles];
      roles.forEach(role => {
        if (role) {
          this.rolesService.addRole(role, permissions);
        }
      });
    }
  }

  private buildMenuBasedOnRole(apiMenu: Menu[], user: User | null): Menu[] {
  if (!user) return apiMenu || [];

  const roles = Array.isArray(user.roles) ? user.roles : [user.roles];
  const isGeneralManager = roles.some(r =>
    r && (r.includes('GENERAL_MANAGER') || r.includes('ADMIN'))
  );

  const finalMenu: Menu[] = [];

  // 1. Dashboard — everyone
  finalMenu.push({
    route: 'dashboard',
    name: 'Dashboard',
    type: 'link',
    icon: 'dashboard'
  });

  // 2. MY SPACE — visible to ALL roles
  finalMenu.push({
    route: '',
    name: 'MY SPACE',
    type: 'subheading',
    icon: 'person',
    children: [
      {
        route: 'attendance',
        name: 'My Attendance',
        icon: 'access_time',
        type: 'sub',
        children: [
          { route: 'dashboard', name: 'Summary',    icon: 'bar_chart', type: 'link' },
          { route: 'history',   name: 'My History', icon: 'history',   type: 'link' },
        ]
      },
      {
        route: 'leave',
        name: 'Leave Request',
        icon: 'beach_access',
        type: 'link'
      }
    ]
  });

  // 3. ADMIN SECTION — GM/Admin only
  if (isGeneralManager) {
    finalMenu.push({
      route: '',
      name: 'MANAGEMENT',
      type: 'subheading',
      icon: 'admin_panel_settings',
      children: [
        {
          route: 'attendance',
          name: 'Attendance Management',
          icon: 'access_time',
          type: 'sub',
          children: [
            { route: 'all', name: 'All Employees', icon: 'groups', type: 'link' },
          ]
        }
      ]
    });
  }

  // 4. API items (Projects, User Management) — filter users for non-GM
  if (apiMenu?.length) {
    apiMenu
      .filter(item => item.route !== 'dashboard')
      .filter(item => item.route !== 'users' || isGeneralManager)
      .forEach(item => finalMenu.push(item));
  } else {
    finalMenu.push(
      { route: 'projects', name: 'Projects', type: 'link', icon: 'folder_special' }
    );
    if (isGeneralManager) {
      finalMenu.push(
        { route: 'users', name: 'User Management', type: 'link', icon: 'people' }
      );
    }
  }

  return finalMenu;
}

private getDefaultMenuForRole(user: User | null): Menu[] {
  if (!user) return [];

  const roles = Array.isArray(user.roles) ? user.roles : [user.roles];
  const isGeneralManager = roles.some(r =>
    r && (r.includes('GENERAL_MANAGER') || r.includes('ADMIN'))
  );

  const menu: Menu[] = [
    { route: 'dashboard', name: 'Dashboard', type: 'link', icon: 'dashboard' },
    {
      route: '',
      name: 'MY SPACE',
      type: 'subheading',
      icon: 'person',
      children: [
        {
          route: 'attendance',
          name: 'My Attendance',
          icon: 'access_time',
          type: 'sub',
          children: [
            { route: 'dashboard', name: 'Summary',    icon: 'bar_chart', type: 'link' },
            { route: 'history',   name: 'My History', icon: 'history',   type: 'link' },
          ]
        },
        { route: 'leave', name: 'Leave Request', icon: 'beach_access', type: 'link' }
      ]
    }
  ];

  if (isGeneralManager) {
    menu.push({
      route: '',
      name: 'MANAGEMENT',
      type: 'subheading',
      icon: 'admin_panel_settings',
      children: [
        {
          route: 'attendance',
          name: 'Attendance Management',
          icon: 'access_time',
          type: 'sub',
          children: [
            { route: 'all', name: 'All Employees', icon: 'groups', type: 'link' }
          ]
        }
      ]
    });
    menu.push(
      { route: 'users', name: 'User Management', type: 'link', icon: 'people' }
    );
  }

  menu.push(
    { route: 'projects', name: 'Projects', type: 'link', icon: 'folder_special' }
  );

  return menu;
}}