// src/app/core/interceptors/token-interceptor.ts
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
import { catchError } from 'rxjs/operators';
import { TokenService } from '@core/authentication';
import { BASE_URL } from './base-url-interceptor';

@Injectable()
export class TokenInterceptor implements HttpInterceptor {
  private hasHttpScheme = (url: string) => new RegExp('^http(s)?://', 'i').test(url);

  constructor(
    private tokenService: TokenService,
    private router: Router,
    @Optional() @Inject(BASE_URL) private baseUrl?: string
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // 🔍 LOGS DE DEBUG
    console.log('🔍 Intercepting:', request.url);
    console.log('🔍 Token valid:', this.tokenService.valid());

    const bearerToken = this.tokenService.getBearerToken();
    console.log('🔍 Bearer token from service:', bearerToken);

    // Ne pas ajouter de token pour les requêtes d'authentification
    if (
      request.url.includes('/auth/login') ||
      request.url.includes('/auth/register') ||
      request.url.includes('/auth/activate') ||
      request.url.includes('/auth/validate-activation-token')
    ) {
      console.log('⏩ Bypassing token for:', request.url);
      return next.handle(request);
    }

    // Pour les autres requêtes, ajouter le token si disponible
    if (bearerToken) {
      console.log('✅ Adding token to:', request.url);

      const cloned = request.clone({
        setHeaders: {
          Authorization: bearerToken,
        },
      });

      return next.handle(cloned).pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('❌ Error after adding token:', error);
          if (error.status === 401 || error.status === 403) {
            console.log('🔐 Token rejected, clearing...');
            this.tokenService.clear();
            this.router.navigate(['/auth/login']);
          }
          return throwError(() => error);
        })
      );
    }

    console.log('⚠️ No token added for:', request.url);
    return next.handle(request);
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
