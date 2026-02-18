import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Token, User } from './interface';
import { Menu } from '@core';
import { RegisterPayload, RegistrationResponse } from './register-request';

export interface ActivationRequest {
  token: string;
  username: string;
  newPassword: string;
  confirmPassword: string;
}

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  constructor(protected http: HttpClient) {}

  login(email: string, password: string, rememberMe = false): Observable<Token> {
    console.log('🚀 Login avec:', { email });

    return this.http.post<any>('/api/auth/login', { email, password }).pipe(
      map(response => {
        console.log('📦 Réponse brute:', response);

        const token: Token = {
          access_token: response.token,
          token_type: response.tokenType,
          expires_in: response.expiresIn,
          refresh_token: response.refresh_token,
        };

        // Stocker l'utilisateur immédiatement
        if (response.user) {
          localStorage.setItem('currentUser', JSON.stringify(response.user));
        }

        return token;
      })
    );
  }

  register(payload: RegisterPayload): Observable<RegistrationResponse> {
    return this.http.post<RegistrationResponse>('/api/auth/register', payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  resendActivationEmail(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('/api/auth/resend-activation', null, {
      params: { email },
    });
  }

  // Validate activation token
  validateActivationToken(token: string): Observable<{
    valid: boolean;
    email?: string;
    firstName?: string;
    lastName?: string;
    message?: string;
  }> {
    return this.http.get<{
      valid: boolean;
      email?: string;
      firstName?: string;
      lastName?: string;
      message?: string;
    }>(`/api/auth/validate-activation-token/${token}`);
  }

  // FIXED: Match exactly with ActivationRequestDTO
  activateAccount(token: string, password: string, username: string): Observable<Token> {
    const payload: ActivationRequest = {
      token,
      username,
      newPassword: password,
      confirmPassword: password, // Backend requires both
    };

    console.log('🔵 Sending activation payload:', payload);

    return this.http.post<Token>('/api/auth/activate', payload);
  }

  refresh(params: Record<string, any>) {
    return this.http.post<Token>('/api/auth/refresh', params);
  }

  logout(): Observable<any> {
    console.log('🔵 Déconnexion en cours...');

    return this.http.post<any>('/api/auth/logout', {}).pipe(
      tap((response: any) => {
        console.log('✅ Déconnexion réussie:', response);

        // Nettoie le stockage local
        localStorage.removeItem('ng-matero-token');
        sessionStorage.removeItem('ng-matero-token');

        // Redirige vers login
        window.location.href = '/auth/login';
      }),
      catchError(error => {
        console.error('❌ Erreur déconnexion:', error);

        // Même en cas d'erreur, on déconnecte localement
        localStorage.removeItem('ng-matero-token');
        sessionStorage.removeItem('ng-matero-token');
        window.location.href = '/auth/login';

        return of({ success: true, local: true });
      })
    );
  }

  me() {
    return this.http.get<User>('/api/auth/me');
  }

  menu() {
    return this.http.get<{ menu: Menu[] }>('/api/auth/me/menu').pipe(map(res => res.menu));
  }
}
