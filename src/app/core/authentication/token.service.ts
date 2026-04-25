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
    if (!token) {
      const rawToken = localStorage.getItem('ng-matero-token');
      if (rawToken) {
        try {
          const parsed = JSON.parse(rawToken);
          if (parsed.access_token) {
            return `Bearer ${parsed.access_token}`;
          }
        } catch {
          // ignore malformed JSON in localStorage
        }
      }
      return '';
    }

    return token.getBearerToken() || '';
  }

  getRefreshToken(): string | void {
    return this.token?.refresh_token;
  }

  ngOnDestroy(): void {
    this.clearRefresh();
  }

  private buildRefresh(): void {
    this.clearRefresh();

    if (this.token?.needRefresh()) {
      this.timer$ = timer(this.token.getRefreshTime() * 1000).subscribe(() => {
        this.refresh$.next(this.token);
      });
    }
  }

  private clearRefresh(): void {
    if (this.timer$ && !this.timer$.closed) {
      this.timer$.unsubscribe();
    }
  }

  private save(token?: Token): void {
    this._token = undefined;

    if (!token) {
      this.store.remove(this.key);
    } else {
      const tokenData = {
        access_token: token.access_token || token.token,
        token_type: token.token_type || 'Bearer',
        refresh_token: token.refresh_token,
        expires_in: token.expires_in,
      };

      const exp = token.expires_in ? currentTimestamp() + token.expires_in : null;

      const value = {
        ...token,
        ...tokenData,
        exp,
      };

      this.store.set(this.key, filterObject(value as Record<string, unknown>));
    }

    this.change$.next(this.token);
    this.buildRefresh();
  }
}
