import { Inject, Injectable, Optional } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { TokenService } from '@core/authentication';
import { BASE_URL } from './base-url-interceptor';

@Injectable()
export class TokenInterceptor implements HttpInterceptor {
  private hasHttpScheme = (url: string) => /^https?:\/\//i.test(url);

  constructor(
    private tokenService: TokenService,
    private router: Router,
    @Optional() @Inject(BASE_URL) private baseUrl?: string
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.tokenService.getBearerToken();

    console.log('🔐 Interceptor:', {
      url: request.url,
      hasToken: !!token,
      shouldAppend: this.shouldAppendToken(request.url),
    });

    if (token && this.shouldAppendToken(request.url)) {
      request = request.clone({
        setHeaders: { Authorization: token },
        withCredentials: true,
      });
    }

    return next.handle(request).pipe(
      tap(() => {
        if (request.url.includes('/auth/logout')) {
          this.tokenService.clear();
          this.router.navigateByUrl('/auth/login');
        }
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.tokenService.clear();
          this.router.navigateByUrl('/auth/login');
        }
        return throwError(() => error);
      })
    );
  }

  private shouldAppendToken(url: string) {
    return !this.hasHttpScheme(url) || this.includeBaseUrl(url);
  }

  private includeBaseUrl(url: string) {
    if (!this.baseUrl) {
      return false;
    }
    const baseUrl = this.baseUrl.replace(/\/$/, '');
    return new RegExp(`^${baseUrl}`, 'i').test(url);
  }
}
