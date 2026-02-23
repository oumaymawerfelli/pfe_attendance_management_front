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
    console.log('🔍 ===== TOKEN INTERCEPTOR =====');
    console.log('🔍 Timestamp:', new Date().toISOString());
    console.log('🔍 Intercepting:', request.url);
    console.log('🔍 Method:', request.method);
    console.log('🔍 Token valid from service:', this.tokenService.valid());

    // Get token directly from localStorage to verify
    const rawToken = localStorage.getItem('ng-matero-token');
    console.log('🔍 Raw token from localStorage:', rawToken ? 'Found' : 'Not found');

    if (rawToken) {
      try {
        const tokenData = JSON.parse(rawToken);
        console.log('🔍 Token data keys:', Object.keys(tokenData));
        console.log('🔍 Access token exists:', !!tokenData.access_token);
        if (tokenData.access_token) {
          console.log('🔍 Access token preview:', tokenData.access_token.substring(0, 20) + '...');
        }
      } catch (e) {
        console.error('Error parsing token:', e);
      }
    }

    // Try to get token from service
    let bearerToken = this.tokenService.getBearerToken();
    console.log('🔍 Bearer token from service:', bearerToken ? 'Token exists' : 'No token');
    if (bearerToken) {
      console.log('🔍 Bearer token preview:', bearerToken.substring(0, 30) + '...');
    }

    // If service returns empty but we have token in localStorage, extract it manually
    if (!bearerToken && rawToken) {
      try {
        const tokenData = JSON.parse(rawToken);
        if (tokenData.access_token) {
          bearerToken = `Bearer ${tokenData.access_token}`;
          console.log('✅ Manually extracted token from localStorage');
          console.log('✅ Manual token preview:', bearerToken.substring(0, 30) + '...');
        }
      } catch (e) {
        console.error('Error parsing token:', e);
      }
    }

    // Ne pas ajouter de token pour les requêtes d'authentification
    if (
      request.url.includes('/auth/login') ||
      request.url.includes('/auth/register') ||
      request.url.includes('/auth/activate') ||
      request.url.includes('/auth/validate-activation-token')
    ) {
      console.log('⏩ Bypassing token for auth endpoint:', request.url);
      return next.handle(request);
    }

    // Pour les autres requêtes, ajouter le token si disponible
    if (bearerToken) {
      console.log('✅ Adding token to:', request.url);
      console.log('✅ Full token value:', bearerToken);

      const cloned = request.clone({
        setHeaders: {
          Authorization: bearerToken,
          'Content-Type': 'application/json',
        },
        withCredentials: true
      });

      console.log('✅ Cloned request headers:', cloned.headers.keys());
      console.log('✅ Authorization header present:', cloned.headers.has('Authorization'));
      console.log('✅ Authorization header value:', cloned.headers.get('Authorization')?.substring(0, 30) + '...');

      return next.handle(cloned).pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('❌ Error after adding token:', error);
          console.error('❌ Error status:', error.status);
          console.error('❌ Error URL:', error.url);
          if (error.status === 401 || error.status === 403) {
            console.log('🔐 Token rejected, clearing...');
            localStorage.removeItem('ng-matero-token');
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