/**
 * Cloudflare Worker: CORS proxy for VRChat API
 *
 * - Proxies requests to api.vrchat.cloud with CORS headers
 * - Relays authentication cookies/tokens
 * - Validates Service Token (CF-Access-Client-Id / CF-Access-Client-Secret)
 * - Rate limits by IP (hourly) and daily quota via KV
 * - Whitelists only API endpoints used by the app
 */

interface Env {
  ALLOWED_ORIGIN: string;
  VRCHAT_API_BASE: string;
  QUOTA: KVNamespace;
  // Set via `wrangler secret put`. Optional: if unset, token validation is skipped.
  CF_ACCESS_CLIENT_ID?: string;
  CF_ACCESS_CLIENT_SECRET?: string;
}

const DAILY_QUOTA = 90_000;
const IP_HOURLY_LIMIT = 500;

interface AllowedRoute {
  method: string;
  pattern: RegExp;
}

// Whitelist: only endpoints the app actually uses
const ALLOWED_ROUTES: AllowedRoute[] = [
  { method: 'GET', pattern: /^\/auth\/user$/ },
  {
    method: 'POST',
    pattern: /^\/auth\/twofactorauth\/(totp|emailotp|otp)\/verify$/,
  },
  { method: 'PUT', pattern: /^\/logout$/ },
  { method: 'GET', pattern: /^\/favorites$/ },
  { method: 'GET', pattern: /^\/worlds$/ },
  { method: 'GET', pattern: /^\/worlds\/[^/]+$/ },
  { method: 'POST', pattern: /^\/instances$/ },
  { method: 'GET', pattern: /^\/users\/[^/]+\/groups$/ },
  { method: 'GET', pattern: /^\/groups\/[^/]+\/instances\/permissions$/ },
];

function isRouteAllowed(method: string, apiPath: string): boolean {
  return ALLOWED_ROUTES.some(
    (route) => route.method === method && route.pattern.test(apiPath),
  );
}

function corsHeaders(origin: string, allowedOrigin: string): HeadersInit {
  const effectiveOrigin =
    origin === allowedOrigin || allowedOrigin === '*' ? origin : allowedOrigin;
  return {
    'Access-Control-Allow-Origin': effectiveOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, Cookie, X-Requested-With, CF-Access-Client-Id, CF-Access-Client-Secret',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Expose-Headers': 'X-Quota-Remaining, Set-Cookie',
  };
}

async function getQuotaRemaining(env: Env): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const key = `quota:${today}`;
  const current = parseInt((await env.QUOTA.get(key)) || '0', 10);
  return Math.max(0, DAILY_QUOTA - current);
}

async function incrementQuota(env: Env): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const key = `quota:${today}`;
  const current = parseInt((await env.QUOTA.get(key)) || '0', 10);
  const next = current + 1;
  await env.QUOTA.put(key, String(next), { expirationTtl: 172800 });
  return Math.max(0, DAILY_QUOTA - next);
}

async function checkIpRateLimit(env: Env, ip: string): Promise<boolean> {
  const hour = new Date().toISOString().slice(0, 13); // "2025-05-03T12"
  const key = `ip:${ip}:${hour}`;
  const current = parseInt((await env.QUOTA.get(key)) || '0', 10);
  if (current >= IP_HOURLY_LIMIT) return false;
  await env.QUOTA.put(key, String(current + 1), { expirationTtl: 7200 });
  return true;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
  ): Promise<Response> {
    const origin = request.headers.get('Origin') || '';

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin, env.ALLOWED_ORIGIN),
      });
    }

    // Verify origin
    if (env.ALLOWED_ORIGIN !== '*' && origin !== env.ALLOWED_ORIGIN) {
      return new Response('Forbidden', { status: 403 });
    }

    // Validate Service Token if configured
    if (env.CF_ACCESS_CLIENT_ID && env.CF_ACCESS_CLIENT_SECRET) {
      const clientId = request.headers.get('CF-Access-Client-Id');
      const clientSecret = request.headers.get('CF-Access-Client-Secret');
      if (
        clientId !== env.CF_ACCESS_CLIENT_ID ||
        clientSecret !== env.CF_ACCESS_CLIENT_SECRET
      ) {
        return new Response('Unauthorized', {
          status: 401,
          headers: corsHeaders(origin, env.ALLOWED_ORIGIN),
        });
      }
    }

    // IP rate limiting
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    if (ip !== 'unknown') {
      const allowed = await checkIpRateLimit(env, ip);
      if (!allowed) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: {
            ...corsHeaders(origin, env.ALLOWED_ORIGIN),
            'Content-Type': 'application/json',
          },
        });
      }
    }

    // Daily quota check
    const remaining = await getQuotaRemaining(env);
    if (remaining <= 0) {
      return new Response(JSON.stringify({ error: 'Daily quota exceeded' }), {
        status: 429,
        headers: {
          ...corsHeaders(origin, env.ALLOWED_ORIGIN),
          'Content-Type': 'application/json',
          'X-Quota-Remaining': '0',
        },
      });
    }

    // Build proxied URL
    const url = new URL(request.url);
    const apiPath = url.pathname.replace(/^\/api\/1/, '');

    // Whitelist check
    if (!isRouteAllowed(request.method, apiPath)) {
      return new Response('Not Found', {
        status: 404,
        headers: corsHeaders(origin, env.ALLOWED_ORIGIN),
      });
    }

    const targetUrl = `${env.VRCHAT_API_BASE}${apiPath}${url.search}`;

    const proxyHeaders = new Headers(request.headers);
    proxyHeaders.delete('Host');
    proxyHeaders.delete('Origin');
    // Don't forward internal Service Token to VRChat API
    proxyHeaders.delete('CF-Access-Client-Id');
    proxyHeaders.delete('CF-Access-Client-Secret');

    const proxyRequest = new Request(targetUrl, {
      method: request.method,
      headers: proxyHeaders,
      body:
        request.method !== 'GET' && request.method !== 'HEAD'
          ? request.body
          : undefined,
    });

    try {
      const response = await fetch(proxyRequest);

      const quotaRemaining = await incrementQuota(env);

      const responseHeaders = new Headers(response.headers);
      const cors = corsHeaders(origin, env.ALLOWED_ORIGIN);
      for (const [key, value] of Object.entries(cors)) {
        responseHeaders.set(key, value);
      }
      responseHeaders.set('X-Quota-Remaining', String(quotaRemaining));

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'Proxy error', details: String(err) }),
        {
          status: 502,
          headers: {
            ...corsHeaders(origin, env.ALLOWED_ORIGIN),
            'Content-Type': 'application/json',
          },
        },
      );
    }
  },
} satisfies ExportedHandler<Env>;
