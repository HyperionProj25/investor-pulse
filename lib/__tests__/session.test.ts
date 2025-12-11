import { createSessionToken, verifySessionToken } from '../session';

describe('Session Management', () => {
  describe('createSessionToken', () => {
    it('should create a valid session token', () => {
      const token = createSessionToken('test-slug', 'investor');
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(2);
    });

    it('should create tokens with different nonces', () => {
      const token1 = createSessionToken('test-slug', 'investor');
      const token2 = createSessionToken('test-slug', 'investor');
      expect(token1).not.toBe(token2);
    });
  });

  describe('verifySessionToken', () => {
    it('should verify valid session tokens', () => {
      const token = createSessionToken('test-slug', 'investor');
      const session = verifySessionToken(token);

      expect(session).toBeTruthy();
      expect(session?.slug).toBe('test-slug');
      expect(session?.role).toBe('investor');
      expect(session?.exp).toBeGreaterThan(Date.now());
      expect(session?.nonce).toBeTruthy();
    });

    it('should reject tampered tokens', () => {
      const token = createSessionToken('test-slug', 'investor');
      const tamperedToken = token.substring(0, token.length - 5) + 'AAAAA';
      const session = verifySessionToken(tamperedToken);

      expect(session).toBeNull();
    });

    it('should reject malformed tokens', () => {
      expect(verifySessionToken('invalid')).toBeNull();
      expect(verifySessionToken('invalid.token.extra')).toBeNull();
      expect(verifySessionToken('')).toBeNull();
    });

    it('should reject expired tokens', () => {
      // Create a token
      const token = createSessionToken('test-slug', 'investor');

      // Parse the token
      const [encoded] = token.split('.');
      const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8'));

      // Manually create an expired token by setting exp to the past
      payload.exp = Date.now() - 1000; // 1 second ago

      const expiredEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');

      // Create signature for expired payload
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', process.env.SESSION_SECRET!)
        .update(expiredEncoded)
        .digest('base64url');

      const expiredToken = `${expiredEncoded}.${signature}`;

      const session = verifySessionToken(expiredToken);
      expect(session).toBeNull();
    });

    it('should handle different session roles', () => {
      const investorToken = createSessionToken('investor-slug', 'investor');
      const adminToken = createSessionToken('admin-slug', 'admin');
      const deckToken = createSessionToken('deck-slug', 'deck');

      const investorSession = verifySessionToken(investorToken);
      const adminSession = verifySessionToken(adminToken);
      const deckSession = verifySessionToken(deckToken);

      expect(investorSession?.role).toBe('investor');
      expect(adminSession?.role).toBe('admin');
      expect(deckSession?.role).toBe('deck');
    });
  });
});
