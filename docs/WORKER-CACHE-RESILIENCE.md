# Optional Worker cache: failure isolation

The user supplied a Cloudflare diagnosis reporting stale domain binding repairs and Worker exceptions. Those control-plane changes and exception counts were not independently verified here. Cache API failure is a plausible failure path in repository code, not a confirmed explanation of historical production exceptions. A dotted secret name alone does not establish a runtime failure.

On 2026-10-21 direct GET requests to https://djjessejay.ch/ and /__wdjjj/health returned HTTP 200 with x-proxy: wdjjj, HSTS and CSP. The production response included x-proxy-cache, previously absent from the repository Worker. This patch now emits HIT for cached responses, MISS for origin responses after a cache lookup, BYPASS when caching is skipped or unavailable, and STALE for fallback cache responses. Header parity alone does not prove deployed source parity.

The change makes cache acquisition, reads and background writes optional. Failed upstream requests still produce controlled 503/504 responses if no cached response is available. HEAD, query and Range requests do not read fallback cache entries. Security headers and API routing are preserved. No DNS, routes, secrets or bindings are changed. Wrangler already declares apex and www routes, with no custom_domain entry; wildcard coverage is not expanded without a specific need.

Validation: 16 targeted regression cases plus npm test, npm run lint and git diff --check. Test cases cover missing cache, throwing getter, failed read, synchronous/asynchronous write errors, origin failures, cache hits, uncacheable requests and execution-context failure.

Rollback: revert this commit. No data migration required. Residual risk: this is hardening, not proof that the historical exception cause has been repaired; live logs and a fresh post-deployment analytics interval remain necessary. A rolling 24-hour total need not immediately reach zero. Human review is required by AGENTS.md before merge.
