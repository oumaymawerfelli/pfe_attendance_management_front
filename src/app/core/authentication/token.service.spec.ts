import { TestBed } from '@angular/core/testing';
import { tap } from 'rxjs/operators';
import { MemoryStorageService, LocalStorageService } from '@shared/services/storage.service';
import { TokenService, currentTimestamp, TokenFactory, SimpleToken } from '@core/authentication';

describe('TokenService', () => {
  let tokenService: TokenService;
  let tokenFactory: TokenFactory;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: LocalStorageService, useClass: MemoryStorageService }],
    });
    tokenService = TestBed.inject(TokenService);
    tokenFactory = TestBed.inject(TokenFactory);
  });

  it('should be created', () => {
    expect(tokenService).toBeTruthy();
  });

  it('should get authorization header value', () => {
    tokenService.set({
      access_token: 'token',
      token_type: 'bearer',
      expires_in: 3600,
    });
    expect(tokenService.getBearerToken()).toEqual('Bearer token');
  });

  it('cannot get authorization header value when no token set', () => {
    // no tokenService.set()
    expect(tokenService.getBearerToken()).toBe('');
  });

  it('should not have exp when token has no expires_in', () => {
    tokenService.set({ access_token: 'token', token_type: 'bearer' }); // no expires_in
    tokenService
      .change()
      .pipe(tap(token => expect(token!.exp).toBeUndefined()))
      .subscribe();
  });

  it('should has exp when token has expires_in', () => {
    const expiresIn = 3600;
    tokenService.set({ access_token: 'token', token_type: 'bearer', expires_in: expiresIn });

    tokenService
      .change()
      .pipe(tap(token => expect(token!.exp).toEqual(currentTimestamp() + expiresIn)))
      .subscribe();
  });
});
