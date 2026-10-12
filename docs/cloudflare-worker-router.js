/**
 * Cloudflare Worker: djjessejay-router
 *
 * Intelligent routing for hybrid deployment:
 * - API requests (/api/*) → Custom server (origin.djjessejay.ch)
 * - WebSocket (/ws) → Custom server (NOT YET IMPLEMENTED - returns 501)
 * - All other requests → GitHub Pages (marcelraschke.github.io)
 *
 * Deploy to Cloudflare Workers & Pages:
 * 1. Copy this code into Cloudflare dashboard → Workers & Pages → Create → Copy Paste
 * 2. Name the worker: djjessejay-router
 * 3. Save and Deploy
 * 4. Go to Routes and bind to domain: djjessejay.ch/* → djjessejay-router
 */

const CUSTOM_SERVER = 'origin.djjessejay.ch'; // proxied hostname; origin IP is not stored in the repo
const GITHUB_PAGES = 'marcelraschke.github.io';

export default {
  async fetch(request, env = {}) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Route /api/* to custom server
    if (pathname.startsWith('/api/')) {
      return routeToCustomServer(request, url, env);
    }

    // Route /ws to custom server (WebSocket - currently not implemented)
    if (pathname.startsWith('/ws')) {
      // TODO: Implement WebSocket support in server.js first
      return new Response('WebSocket not yet implemented', { status: 501 });
    }

    // Route everything else to GitHub Pages
    return routeToGitHubPages(request, url);
  },
};

async function routeToCustomServer(request, url, env) {
  // The origin hostname only admits this Worker's Access service token (see
  // ORIGIN-PROTECTION-DEPLOYMENT.md). Without it, fail closed instead of sending
  // an unauthenticated request.
  if (!env.ORIGIN_ACCESS_CLIENT_ID || !env.ORIGIN_ACCESS_CLIENT_SECRET) {
    return new Response('API origin credentials not configured', { status: 502 });
  }
  url.hostname = CUSTOM_SERVER;
  const headers = new Headers(request.headers);
  for (const name of ['cf-access-client-id', 'cf-access-client-secret', 'cf-access-jwt-assertion', 'cf-access-token']) headers.delete(name);
  headers.set('cf-access-client-id', env.ORIGIN_ACCESS_CLIENT_ID);
  headers.set('cf-access-client-secret', env.ORIGIN_ACCESS_CLIENT_SECRET);

  try {
    const response = await fetch(new Request(url.toString(), {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
    }));

    return response;
  } catch (error) {
    console.error('Custom server error:', error);
    return new Response('Service Unavailable', { status: 503 });
  }
}

async function routeToGitHubPages(request, url) {
  // Update the hostname to GitHub Pages
  url.hostname = GITHUB_PAGES;

  try {
    const response = await fetch(new Request(url.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
    }));

    return response;
  } catch (error) {
    console.error('GitHub Pages error:', error);
    return new Response('Gateway Error', { status: 502 });
  }
}
