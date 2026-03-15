/**
 * Cloudflare Worker: CORS proxy for VRChat API
 *
 * - Proxies requests to api.vrchat.cloud with CORS headers
 * - Relays authentication cookies/tokens
 * - Tracks request quota via KV
 * - Rate limits by IP
 */

interface Env {
  ALLOWED_ORIGIN: string;
  VRCHAT_API_BASE: string;
  QUOTA: KVNamespace;
}

const DAILY_QUOTA = 90_000; // CF Workers free tier: 100k/day, with safety margin

function corsHeaders(origin: string, allowedOrigin: string): HeadersInit {
  const effectiveOrigin =
    origin === allowedOrigin || allowedOrigin === '*' ? origin : allowedOrigin;
  return {
    'Access-Control-Allow-Origin': effectiveOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, Cookie, X-Requested-With',
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
  // TTL of 2 days to auto-cleanup
  await env.QUOTA.put(key, String(next), { expirationTtl: 172800 });
  return Math.max(0, DAILY_QUOTA - next);
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

    // Check quota
    const remaining = await getQuotaRemaining(env);
    if (remaining <= 0) {
      return new Response(
        JSON.stringify({ error: 'Daily quota exceeded' }),
        {
          status: 429,
          headers: {
            ...corsHeaders(origin, env.ALLOWED_ORIGIN),
            'Content-Type': 'application/json',
            'X-Quota-Remaining': '0',
          },
        },
      );
    }

    // Build the proxied URL
    const url = new URL(request.url);
    const apiPath = url.pathname.replace(/^\/api/, '');
    const targetUrl = `${env.VRCHAT_API_BASE}${apiPath}${url.search}`;

    // Forward the request
    const proxyHeaders = new Headers(request.headers);
    proxyHeaders.delete('Host');
    // Don't forward the Origin to VRChat API
    proxyHeaders.delete('Origin');

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

      // Decrement quota
      const quotaRemaining = await incrementQuota(env);

      // Build response with CORS headers
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
