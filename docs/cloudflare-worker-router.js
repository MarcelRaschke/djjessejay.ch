/**
 * Cloudflare Worker: djjessejay-router
 *
 * Intelligent routing for hybrid deployment:
 * - API requests (/api/*) → Custom server (185.101.158.113)
 * - WebSocket (/ws) → Custom server (NOT YET IMPLEMENTED - returns 501)
 * - All other requests → GitHub Pages (marcelraschke.github.io)
 *
 * Deploy to Cloudflare Workers & Pages:
 * 1. Copy this code into Cloudflare dashboard → Workers & Pages → Create → Copy Paste
 * 2. Name the worker: djjessejay-router
 * 3. Save and Deploy
 * 4. Go to Routes and bind to domain: djjessejay.ch/* → djjessejay-router
 */

const CUSTOM_SERVER = '185.101.158.113';
const GITHUB_PAGES = 'marcelraschke.github.io';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Route /api/* to custom server
    if (pathname.startsWith('/api/')) {
      return routeToCustomServer(request, url);
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

async function routeToCustomServer(request, url) {
  // Update the hostname to custom server
  url.hostname = CUSTOM_SERVER;

  try {
    const response = await fetch(new Request(url.toString(), {
      method: request.method,
      headers: request.headers,
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
