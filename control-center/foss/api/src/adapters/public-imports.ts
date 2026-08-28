import { createHash } from 'node:crypto';

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;

export type ExternalImport = {
  sourceType: 'soundcloud' | 'resident-advisor';
  sourceUri: string;
  sourceRevision: string;
  entityType: 'soundcloud-resource' | 'event-evidence';
  externalKey: string;
  payload: Record<string, unknown>;
  contentSha256: string;
  metadata: Record<string, unknown>;
};

function assertHttpsUrl(input: string, allowedHosts: Set<string>): URL {
  const url = new URL(input);
  if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname.toLowerCase())) {
    throw new Error('source_url_not_allowed');
  }
  if (url.username || url.password) throw new Error('source_url_not_allowed');
  return url;
}

async function readLimited(response: Response): Promise<string> {
  if (!response.ok) throw new Error(`upstream_http_${response.status}`);
  const declared = Number(response.headers.get('content-length') ?? '0');
  if (declared > MAX_RESPONSE_BYTES) throw new Error('upstream_response_too_large');

  const reader = response.body?.getReader();
  if (!reader) return '';

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error('upstream_response_too_large');
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

async function fetchText(url: URL, accept: string): Promise<{ body: string; headers: Headers }> {
  const response = await fetch(url, {
    redirect: 'error',
    headers: {
      accept,
      'user-agent': 'DJ-Jesse-Jay-Control-Center/0.1 provenance-importer'
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
  });
  return { body: await readLimited(response), headers: response.headers };
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function revisionFrom(headers: Headers, contentHash: string): string {
  return headers.get('etag') ?? headers.get('last-modified') ?? contentHash;
}

function externalKey(url: URL): string {
  return `${url.hostname}${url.pathname}`.replace(/\/$/, '') || url.hostname;
}

export async function importSoundCloud(sourceUrl: string): Promise<ExternalImport> {
  const source = assertHttpsUrl(sourceUrl, new Set(['soundcloud.com', 'www.soundcloud.com']));
  const oembed = new URL('https://soundcloud.com/oembed');
  oembed.searchParams.set('format', 'json');
  oembed.searchParams.set('url', source.toString());

  const { body, headers } = await fetchText(oembed, 'application/json');
  const parsed = JSON.parse(body) as Record<string, unknown>;
  const hash = sha256(body);

  return {
    sourceType: 'soundcloud',
    sourceUri: source.toString(),
    sourceRevision: revisionFrom(headers, hash),
    entityType: 'soundcloud-resource',
    externalKey: externalKey(source),
    payload: parsed,
    contentSha256: hash,
    metadata: {
      adapter: 'soundcloud-oembed',
      fetchedVia: oembed.origin,
      authoritativeFor: 'public SoundCloud presentation metadata only'
    }
  };
}

function extractJsonLd(html: string): unknown[] {
  const values: unknown[] = [];
  const pattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(pattern)) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      values.push(JSON.parse(raw));
    } catch {
      // Invalid embedded JSON-LD is retained only as an absence of structured evidence.
    }
  }
  return values;
}

export async function importResidentAdvisor(sourceUrl: string): Promise<ExternalImport> {
  const allowed = new Set(['ra.co', 'www.ra.co', 'residentadvisor.net', 'www.residentadvisor.net']);
  const source = assertHttpsUrl(sourceUrl, allowed);
  const { body, headers } = await fetchText(source, 'text/html,application/xhtml+xml');
  const hash = sha256(body);
  const jsonLd = extractJsonLd(body);

  return {
    sourceType: 'resident-advisor',
    sourceUri: source.toString(),
    sourceRevision: revisionFrom(headers, hash),
    entityType: 'event-evidence',
    externalKey: externalKey(source),
    payload: {
      url: source.toString(),
      jsonLd,
      structuredEvidenceFound: jsonLd.length > 0
    },
    contentSha256: hash,
    metadata: {
      adapter: 'resident-advisor-jsonld',
      authoritativeFor: 'public event-page evidence only',
      rawHtmlStored: false
    }
  };
}
