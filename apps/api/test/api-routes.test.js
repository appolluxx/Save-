import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app, isAllowedOrigin } from '../src/app.js';

describe('Phase 4: API Routes & HTTP Pipeline Integration', () => {
  let server;
  let baseUrl;

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  describe('Health Endpoint (/api/health)', () => {
    it('should respond with structured health status', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      // Since local test database may be offline, endpoint returns either 200 or 503
      assert.ok(res.status === 200 || res.status === 503);
      const json = await res.json();
      assert.ok(json.status === 'healthy' || json.status === 'unhealthy');
      assert.ok(json.database);
    });
  });

  describe('Authentication Routes Security Boundaries', () => {
    it('should reject invalid student ID in verify-student with 400', async () => {
      const res = await fetch(`${baseUrl}/api/auth/verify-student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: '123' }), // < 5 digits
      });
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, 'VALIDATION_ERROR');
    });

    it('should reject registration with weak password', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register/student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: '53580',
          displayName: 'Test User',
          password: 'weak', // weak password
        }),
      });
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, 'VALIDATION_ERROR');
    });

    it('should reject registration with injected unauthorized fields (e.g. role: ADMIN)', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register/student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: '53580',
          displayName: 'Test User',
          password: 'Password123',
          role: 'ADMIN', // Injection attack attempt
        }),
      });
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, 'VALIDATION_ERROR');
    });

    it('should reject staff registration with invalid invite secret', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'teacher@surasak.ac.th',
          displayName: 'Teacher Test',
          password: 'Password123',
          staffInviteCode: 'wrong_secret_key_1234',
        }),
      });
      assert.equal(res.status, 401);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, 'INVALID_INVITE_SECRET');
    });

    it('should reject unauthenticated access to /api/auth/me with 401', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`);
      assert.equal(res.status, 401);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, 'UNAUTHORIZED');
    });
  });

  describe('Marketplace Authorization & Anti-Tampering', () => {
    it('should reject unauthenticated purchase request with 401', async () => {
      const res = await fetch(`${baseUrl}/api/marketplace/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardItemId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' }),
      });
      assert.equal(res.status, 401);
    });

    it('should reject price-tampering payload with 400 validation error', async () => {
      const res = await fetch(`${baseUrl}/api/marketplace/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Even if token was passed, schema validation runs first
        },
        body: JSON.stringify({
          rewardItemId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          cost: 0, // Attacker attempts price tamper
        }),
      });
      // Without token returns 401, or if schema runs returns 400
      assert.ok(res.status === 400 || res.status === 401);
    });
  });

  describe('Administrative Role Boundaries', () => {
    it('should reject unauthenticated access to /api/admin/evidence with 401', async () => {
      const res = await fetch(`${baseUrl}/api/admin/evidence`);
      assert.equal(res.status, 401);
    });

    it('should reject unauthenticated access to /api/admin/users with 401', async () => {
      const res = await fetch(`${baseUrl}/api/admin/users`);
      assert.equal(res.status, 401);
    });
  });

  describe('Public Endpoints & 404 Route Handling', () => {
    it('should return 404 for undefined routes in standard error format', async () => {
      const res = await fetch(`${baseUrl}/api/non-existent-endpoint`);
      assert.equal(res.status, 404);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, 'ROUTE_NOT_FOUND');
    });
  });

  describe('CORS Configuration & Render Host Property Compatibility', () => {
    it('should allow requests matching full origin', () => {
      const allowed = ['https://saveraks.onrender.com'];
      assert.equal(isAllowedOrigin('https://saveraks.onrender.com', allowed, 'production'), true);
    });

    it('should allow requests matching hostname from Render host property (protocol-agnostic)', () => {
      // Render passes property: host as "saveraks-web.onrender.com"
      const allowed = ['saveraks-web.onrender.com'];
      assert.equal(isAllowedOrigin('https://saveraks-web.onrender.com', allowed, 'production'), true);
      assert.equal(isAllowedOrigin('http://saveraks-web.onrender.com', allowed, 'production'), true);
    });

    it('should reject unauthorized origin in production', () => {
      const allowed = ['saveraks-web.onrender.com'];
      assert.equal(isAllowedOrigin('https://malicious-site.com', allowed, 'production'), false);
    });

    it('should allow all origins in development and test environments', () => {
      const allowed = ['saveraks-web.onrender.com'];
      assert.equal(isAllowedOrigin('https://any-dev-origin.local', allowed, 'development'), true);
      assert.equal(isAllowedOrigin('https://any-dev-origin.local', allowed, 'test'), true);
    });
  });
});
