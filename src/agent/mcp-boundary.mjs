const TOOL_EFFECTS = new Set(['read', 'write', 'execute', 'delete']);
const OPERATION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const FORBIDDEN_INPUT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const FORBIDDEN_SECRET_KEYS = new Set([
  'api_key',
  'apikey',
  'api-key',
  'access_token',
  'access-token',
  'auth_token',
  'auth-token',
  'client_secret',
  'client-secret',
  'private_key',
  'private-key',
  'secret_key',
  'secret-key'
]);
const DEFAULT_RETRYABLE_CODES = new Set([
  'ECONNRESET',
  'EPIPE',
  'ETIMEDOUT',
  'MCP_CONNECTION_CLOSED',
  'MCP_TRANSPORT_UNAVAILABLE'
]);
const DEFAULT_RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

export class ToolRequestDeniedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ToolRequestDeniedError';
    this.code = 'TOOL_REQUEST_DENIED';
  }
}

function deny(message) {
  throw new ToolRequestDeniedError(message);
}

function isPlainRecord(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertJsonSafe(value, path = 'input', seen = new Set(), depth = 0) {
  if (depth > 32) {
    deny(`${path} exceeds the maximum nesting depth`);
  }

  if (
    value === null
    || typeof value === 'string'
    || typeof value === 'boolean'
  ) {
    return;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      deny(`${path} contains a non-finite number`);
    }
    return;
  }

  if (typeof value !== 'object') {
    deny(`${path} must contain only JSON-compatible values`);
  }

  if (seen.has(value)) {
    deny(`${path} contains a cycle`);
  }
  seen.add(value);

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      assertJsonSafe(value[index], `${path}[${index}]`, seen, depth + 1);
    }
    seen.delete(value);
    return;
  }

  if (!isPlainRecord(value)) {
    deny(`${path} must contain only plain objects`);
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (FORBIDDEN_INPUT_KEYS.has(key)) {
      deny(`${path} contains forbidden key ${key}`);
    }
    if (FORBIDDEN_SECRET_KEYS.has(key.toLowerCase())) {
      deny(`${path} contains a credential-shaped key; secrets must not enter tool context`);
    }
    assertJsonSafe(nestedValue, `${path}.${key}`, seen, depth + 1);
  }

  seen.delete(value);
}

function normalizeAllowedEffects(policy, tool) {
  if (!isPlainRecord(policy) || !isPlainRecord(policy.tools)) {
    deny('policy.tools must be a plain object');
  }

  if (!Object.hasOwn(policy.tools, tool)) {
    deny(`tool ${tool} is not allowlisted`);
  }

  const allowedEffects = policy.tools[tool];
  if (!Array.isArray(allowedEffects) || allowedEffects.length === 0) {
    deny(`tool ${tool} has no allowed effects`);
  }

  return allowedEffects;
}

/**
 * Fail closed unless a request is well-formed and explicitly permitted.
 * This function is synchronous so no dispatch can race ahead of authorization.
 *
 * @param {import('./mcp-boundary.d.ts').InternalToolRequest} request
 * @param {import('./mcp-boundary.d.ts').ToolPolicy} policy
 * @returns {import('./mcp-boundary.d.ts').InternalToolRequest}
 */
export function assertToolRequestIsSafe(request, policy) {
  if (!isPlainRecord(request)) {
    deny('tool request must be a plain object');
  }

  if (typeof request.operationId !== 'string'
      || !OPERATION_ID_PATTERN.test(request.operationId)) {
    deny('operationId must be 8-128 characters and use only A-Z, a-z, 0-9, ., _, :, or -');
  }

  if (typeof request.tool !== 'string' || request.tool.length === 0) {
    deny('tool must be a non-empty string');
  }

  if (!TOOL_EFFECTS.has(request.effect)) {
    deny(`unsupported effect ${String(request.effect)}`);
  }

  if (!isPlainRecord(request.input)) {
    deny('input must be a plain object');
  }
  assertJsonSafe(request.input);

  const allowedEffects = normalizeAllowedEffects(policy, request.tool);
  if (!allowedEffects.includes(request.effect)) {
    deny(`effect ${request.effect} is not allowed for tool ${request.tool}`);
  }

  if (policy.authorize !== undefined) {
    if (typeof policy.authorize !== 'function') {
      deny('policy.authorize must be a function');
    }
    if (policy.authorize(request) !== true) {
      deny(`operation ${request.operationId} was not authorized`);
    }
  }

  return request;
}

function readRetryConfig(retry = {}) {
  if (!isPlainRecord(retry)) {
    throw new TypeError('retry must be a plain object');
  }

  const maxAttempts = retry.maxAttempts ?? 3;
  const baseDelayMs = retry.baseDelayMs ?? 25;
  const maxDelayMs = retry.maxDelayMs ?? 1000;

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 5) {
    throw new RangeError('retry.maxAttempts must be an integer from 1 to 5');
  }
  if (!Number.isFinite(baseDelayMs) || baseDelayMs < 0 || baseDelayMs > 5000) {
    throw new RangeError('retry.baseDelayMs must be between 0 and 5000');
  }
  if (!Number.isFinite(maxDelayMs) || maxDelayMs < baseDelayMs || maxDelayMs > 10000) {
    throw new RangeError('retry.maxDelayMs must be between baseDelayMs and 10000');
  }

  return { maxAttempts, baseDelayMs, maxDelayMs };
}

function isRetryableError(error) {
  return Boolean(
    DEFAULT_RETRYABLE_CODES.has(error?.code)
    || DEFAULT_RETRYABLE_STATUSES.has(error?.status)
  );
}

function isConnectionError(error) {
  return error?.code === 'MCP_CONNECTION_CLOSED'
    || error?.code === 'MCP_TRANSPORT_UNAVAILABLE'
    || error?.code === 'ECONNRESET'
    || error?.code === 'EPIPE';
}

function defaultSleep(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

/**
 * The only raw MCP transport dispatch point in the repository.
 * Mutating effects are never automatically replayed. Read requests are bounded
 * and re-authorized immediately before every transport call.
 *
 * @param {import('./mcp-boundary.d.ts').InternalToolRequest} request
 * @param {import('./mcp-boundary.d.ts').DispatchOptions} options
 * @returns {Promise<unknown>}
 */
export async function dispatchToolRequest(request, options) {
  if (!isPlainRecord(options)) {
    throw new TypeError('dispatch options must be a plain object');
  }

  const { transport, policy, sleep = defaultSleep } = options;
  if (transport === null
      || (typeof transport !== 'object' && typeof transport !== 'function')
      || typeof transport.call !== 'function') {
    throw new TypeError('transport.call must be a function');
  }
  if (typeof sleep !== 'function') {
    throw new TypeError('sleep must be a function');
  }

  const retry = readRetryConfig(options.retry);
  let reconnected = false;

  for (let attempt = 1; attempt <= retry.maxAttempts; attempt += 1) {
    // Boundary invariant: this assertion must remain immediately before the
    // only raw transport dispatch. It is deliberately repeated on retries.
    assertToolRequestIsSafe(request, policy);

    try {
      return await transport.call(request.tool, request.input, Object.freeze({
        operationId: request.operationId,
        effect: request.effect,
        attempt
      }));
    } catch (error) {
      const mayReplay = request.effect === 'read';
      const attemptsRemain = attempt < retry.maxAttempts;

      if (!mayReplay || !attemptsRemain || !isRetryableError(error)) {
        throw error;
      }

      if (!reconnected && isConnectionError(error)
          && typeof transport.reconnect === 'function') {
        reconnected = true;
        await transport.reconnect({ operationId: request.operationId });
      }

      const delayMs = Math.min(
        retry.baseDelayMs * (2 ** (attempt - 1)),
        retry.maxDelayMs
      );
      await sleep(delayMs);
    }
  }

  throw new Error('unreachable dispatch state');
}
