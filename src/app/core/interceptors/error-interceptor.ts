import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { TokenService } from '@core/authentication';

export enum STATUS {
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
}

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  private errorPages = [STATUS.FORBIDDEN, STATUS.NOT_FOUND, STATUS.INTERNAL_SERVER_ERROR];

  // 🔥 Routes that should NOT trigger redirects on auth errors
  private publicRoutes = ['/auth/', '/register', '/activate', '/login', '/registration-success'];

  private getMessage = (error: HttpErrorResponse) => {
    if (error.error?.message) return error.error.message;
    if (error.error?.msg) return error.error.msg;
    return `${error.status} ${error.statusText}`;
  };

  constructor(
    private router: Router,
    private toast: ToastrService,
    private tokenService: TokenService
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next
      .handle(request)
      .pipe(catchError((error: HttpErrorResponse) => this.handleError(error)));
  }

  // 🔥 Helper: are we currently on a public route?
  private isOnPublicRoute(): boolean {
    const url = this.router.url;
    return this.publicRoutes.some(route => url.includes(route));
  }

  private handleError(error: HttpErrorResponse) {
    // 🔥 Don't redirect or toast errors when on public pages (login, activate, register)
    // Background calls (notifications, etc) shouldn't kick the user around
    if (this.isOnPublicRoute()) {
      console.warn(`Suppressed ${error.status} error on public route:`, error.url);
      return throwError(() => error);
    }

    if (this.errorPages.includes(error.status)) {
      this.router.navigateByUrl(`/${error.status}`, {
        skipLocationChange: true,
      });
    } else {
      console.error('ERROR', error);
      this.toast.error(this.getMessage(error));

      if (error.status === STATUS.UNAUTHORIZED) {
        console.log('🔐 Token invalid - clearing and redirecting to login');
        localStorage.removeItem('ng-matero-token');
        localStorage.removeItem('currentUser');
        this.tokenService.clear();
        this.router.navigateByUrl('/auth/login');
      }
    }

    return throwError(() => error);
  }
}