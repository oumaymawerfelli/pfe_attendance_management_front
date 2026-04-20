import { base64, currentTimestamp, JwtToken } from '@core/authentication';

describe('Token', () => {
  describe('JwtToken', () => {
    function generateToken(params: any, typ = 'JWT') {
      return [
        base64.encode(JSON.stringify({ typ, alg: 'HS256' })),
        base64.encode(JSON.stringify(params)),
        base64.encode('ng-matero'),
      ].join('.');
    }

    const exp = currentTimestamp() + 3600;

    // ✅ Token AVEC exp dans le payload
    const tokenWithExp = new JwtToken({
      access_token: generateToken({ exp }),
      token_type: 'Bearer',
      expires_in: 3600,
    });

    // ✅ Token SANS exp dans le payload
    const tokenWithoutExp = new JwtToken({
      access_token: generateToken({}),
      token_type: 'Bearer',
      expires_in: 3600,
    });

    it('test access_token is JWT', () => {
      expect(JwtToken.is(tokenWithExp.access_token)).toBeTrue();
    });

    it('test bearer token', () => {
      expect(tokenWithExp.getBearerToken()).toBe(`Bearer ${tokenWithExp.access_token}`);
    });

    // ✅ Token avec exp → doit retourner la valeur
    it('test payload has exp attribute', () => {
      expect(tokenWithExp.exp).toEqual(exp);
    });

    // ✅ Token sans exp → doit retourner undefined
    it('test payload does not has exp attribute', () => {
      expect(tokenWithoutExp.exp).toBeUndefined();
    });

    // ✅ Même vérification avec une instance locale
    it('test does not has exp attribute', () => {
      const token = new JwtToken({
        access_token: generateToken({}),
        token_type: 'Bearer',
        expires_in: 3600,
      });
      expect(token.exp).toBeUndefined();
    });
  });
});
