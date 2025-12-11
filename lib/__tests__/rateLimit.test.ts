import { checkRateLimit, getClientIp } from '../rateLimit';

describe('Rate Limiting', () => {
  describe('checkRateLimit', () => {
    it('should allow requests under the limit', () => {
      const identifier = 'test-ip-1';
      const config = { maxRequests: 5, windowMs: 60000 };

      const result1 = checkRateLimit(identifier, config);
      expect(result1.success).toBe(true);
      expect(result1.remaining).toBe(4);

      const result2 = checkRateLimit(identifier, config);
      expect(result2.success).toBe(true);
      expect(result2.remaining).toBe(3);
    });

    it('should block requests over the limit', () => {
      const identifier = 'test-ip-2';
      const config = { maxRequests: 3, windowMs: 60000 };

      // Make 3 requests (max)
      checkRateLimit(identifier, config);
      checkRateLimit(identifier, config);
      const result3 = checkRateLimit(identifier, config);

      expect(result3.success).toBe(true);
      expect(result3.remaining).toBe(0);

      // 4th request should be blocked
      const result4 = checkRateLimit(identifier, config);
      expect(result4.success).toBe(false);
      expect(result4.remaining).toBe(0);
    });

    it('should reset after window expires', async () => {
      const identifier = 'test-ip-3';
      const config = { maxRequests: 2, windowMs: 100 }; // 100ms window

      // Use up the limit
      checkRateLimit(identifier, config);
      checkRateLimit(identifier, config);

      const blockedResult = checkRateLimit(identifier, config);
      expect(blockedResult.success).toBe(false);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should allow requests again
      const newResult = checkRateLimit(identifier, config);
      expect(newResult.success).toBe(true);
      expect(newResult.remaining).toBe(1);
    });

    it('should track different identifiers separately', () => {
      const config = { maxRequests: 2, windowMs: 60000 };

      const result1 = checkRateLimit('ip-1', config);
      const result2 = checkRateLimit('ip-2', config);

      expect(result1.success).toBe(true);
      expect(result1.remaining).toBe(1);
      expect(result2.success).toBe(true);
      expect(result2.remaining).toBe(1);
    });

    it('should include rate limit headers info', () => {
      const identifier = 'test-ip-4';
      const config = { maxRequests: 5, windowMs: 60000 };

      const result = checkRateLimit(identifier, config);

      expect(result.limit).toBe(5);
      expect(result.remaining).toBeDefined();
      expect(result.resetAt).toBeGreaterThan(Date.now());
    });
  });

  describe('getClientIp', () => {
    // Helper to create a mock Request object
    const createMockRequest = (headers: Record<string, string> = {}) => {
      const headersMap = new Map(Object.entries(headers));
      return {
        headers: {
          get: (key: string) => headersMap.get(key) || null,
        },
      } as Request;
    };

    it('should extract IP from x-forwarded-for header', () => {
      const request = createMockRequest({ 'x-forwarded-for': '192.168.1.1, 10.0.0.1' });

      const ip = getClientIp(request);
      expect(ip).toBe('192.168.1.1');
    });

    it('should extract IP from x-real-ip header', () => {
      const request = createMockRequest({ 'x-real-ip': '192.168.1.2' });

      const ip = getClientIp(request);
      expect(ip).toBe('192.168.1.2');
    });

    it('should prioritize x-forwarded-for over x-real-ip', () => {
      const request = createMockRequest({
        'x-forwarded-for': '192.168.1.1',
        'x-real-ip': '192.168.1.2',
      });

      const ip = getClientIp(request);
      expect(ip).toBe('192.168.1.1');
    });

    it('should return unknown if no IP headers present', () => {
      const request = createMockRequest();

      const ip = getClientIp(request);
      expect(ip).toBe('unknown');
    });
  });
});
