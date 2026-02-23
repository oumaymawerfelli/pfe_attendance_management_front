// core/authentication/token.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { LocalStorageService } from '@shared';
import { BehaviorSubject, Observable, Subject, Subscription, timer } from 'rxjs';
import { share } from 'rxjs/operators';
import { currentTimestamp, filterObject } from './helpers';
import { Token } from './interface';
import { BaseToken } from './token';
import { TokenFactory } from './token-factory.service';

@Injectable({
  providedIn: 'root',
})
export class TokenService implements OnDestroy {
  private key = 'ng-matero-token';

  private change$ = new BehaviorSubject<BaseToken | undefined>(undefined);
  private refresh$ = new Subject<BaseToken | undefined>();
  private timer$?: Subscription;

  private _token?: BaseToken;

  constructor(
    private store: LocalStorageService,
    private factory: TokenFactory
  ) {}

  private get token(): BaseToken | undefined {
    if (!this._token) {
      this._token = this.factory.create(this.store.get(this.key));
    }
    return this._token;
  }

  change(): Observable<BaseToken | undefined> {
    return this.change$.pipe(share());
  }

  refresh(): Observable<BaseToken | undefined> {
    this.buildRefresh();
    return this.refresh$.pipe(share());
  }

  set(token?: Token): TokenService {
    this.save(token);
    return this;
  }

  clear(): void {
    this.save();
  }

  valid(): boolean {
    return this.token?.valid() ?? false;
  }

 getBearerToken(): string {
  const token = this.token;
  console.log('🔍 TokenService.token:', token);

  if (!token) {
    console.log('❌ No token found in TokenService');
    
    // Try to read from localStorage directly as fallback
    const rawToken = localStorage.getItem('ng-matero-token');
    if (rawToken) {
      try {
        const parsed = JSON.parse(rawToken);
        if (parsed.access_token) {
          console.log('✅ Fallback: extracted token from localStorage');
          return `Bearer ${parsed.access_token}`;
        }
      } catch (e) {
        console.error('Error parsing token in fallback:', e);
      }
    }
    return '';
  }

  const bearerToken = token.getBearerToken();
  console.log('🔍 Bearer token from service:', bearerToken ? 'Token exists' : 'No token');
  return bearerToken;
}

  getRefreshToken(): string | void {
    return this.token?.refresh_token;
  }

  ngOnDestroy(): void {
    this.clearRefresh();
  }

  // ✅ MÉTHODE PRIVÉE AJOUTÉE
  private buildRefresh(): void {
    this.clearRefresh();

    if (this.token?.needRefresh()) {
      this.timer$ = timer(this.token.getRefreshTime() * 1000).subscribe(() => {
        this.refresh$.next(this.token);
      });
    }
  }

  // ✅ MÉTHODE PRIVÉE AJOUTÉE
  private clearRefresh(): void {
    if (this.timer$ && !this.timer$.closed) {
      this.timer$.unsubscribe();
    }
  }

  // ✅ MÉTHODE PRIVÉE AJOUTÉE
  private save(token?: Token): void {
    this._token = undefined;

    if (!token) {
      this.store.remove(this.key);
    } else {
      // ✅ CORRECTION : Utiliser access_token uniquement
      const tokenData = {
        access_token: token.access_token || token.token,
        token_type: token.token_type || 'Bearer',
        refresh_token: token.refresh_token,
        expires_in: token.expires_in,
      };

      // Calculer l'expiration si disponible
      const exp = token.expires_in ? currentTimestamp() + token.expires_in : null;

      // Fusionner avec les données existantes
      const value = {
        ...tokenData,
        ...token,
        exp,
      };

      // Filtrer et sauvegarder
      this.store.set(this.key, filterObject(value as Record<string, unknown>));
    }

    this.change$.next(this.token);
    this.buildRefresh();
  }
}
