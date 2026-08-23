import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ToolRequestDeniedError,
  dispatchToolRequest
} from '../src/agent/mcp-boundary.mjs';

const READ_REQUEST = Object.freeze({
  operationId: 'op.mcp.resources.list.0001',
  effect: 'read',
  tool: 'mcp.resources.list',
  input: { server: 'local-termux' }
});

const POLICY = Object.freeze({
  tools: Object.freeze({
    'mcp.resources.list': Object.freeze(['read']),
    'termux.exec': Object.freeze(['execute'])
  })
});

const NO_SLEEP = async () => {};

test('dispatches an allowlisted request with its audit context', async () => {
  const calls = [];
  const transport = {
    async call(tool, input, context) {
      calls.push({ tool, input, context });
      return { ok: true };
    }
  };

  const result = await dispatchToolRequest(READ_REQUEST, {
    transport,
    policy: POLICY,
    sleep: NO_SLEEP
  });

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(calls, [{
    tool: 'mcp.resources.list',
    input: { server: 'local-termux' },
    context: {
      operationId: 'op.mcp.resources.list.0001',
      effect: 'read',
      attempt: 1
    }
  }]);
});

test('denies a request without operationId before transport dispatch', async () => {
  let calls = 0;
  const transport = {
    async call() {
      calls += 1;
    }
  };

  await assert.rejects(
    dispatchToolRequest({ ...READ_REQUEST, operationId: undefined }, {
      transport,
      policy: POLICY,
      sleep: NO_SLEEP
    }),
    ToolRequestDeniedError
  );
  assert.equal(calls, 0);
});

test('denies an effect mismatch before transport dispatch', async () => {
  let calls = 0;
  const transport = {
    async call() {
      calls += 1;
    }
  };

  await assert.rejects(
    dispatchToolRequest({ ...READ_REQUEST, effect: 'write' }, {
      transport,
      policy: POLICY,
      sleep: NO_SLEEP
    }),
    /effect write is not allowed/
  );
  assert.equal(calls, 0);
});

test('denies prototype-pollution keys before transport dispatch', async () => {
  let calls = 0;
  const input = JSON.parse('{"nested":{"__proto__":{"polluted":true}}}');
  const transport = {
    async call() {
      calls += 1;
    }
  };

  await assert.rejects(
    dispatchToolRequest({ ...READ_REQUEST, input }, {
      transport,
      policy: POLICY,
      sleep: NO_SLEEP
    }),
    /forbidden key __proto__/
  );
  assert.equal(calls, 0);
});

test('retries transient reads with a stable operationId and bounded backoff', async () => {
  const contexts = [];
  const delays = [];
  const transport = {
    async call(_tool, _input, context) {
      contexts.push(context);
      if (contexts.length < 3) {
        const error = new Error('temporary timeout');
        error.code = 'ETIMEDOUT';
        throw error;
      }
      return 'ready';
    }
  };

  const result = await dispatchToolRequest(READ_REQUEST, {
    transport,
    policy: POLICY,
    retry: { maxAttempts: 3, baseDelayMs: 10, maxDelayMs: 100 },
    sleep: async (delayMs) => delays.push(delayMs)
  });

  assert.equal(result, 'ready');
  assert.deepEqual(contexts.map(({ operationId }) => operationId), [
    READ_REQUEST.operationId,
    READ_REQUEST.operationId,
    READ_REQUEST.operationId
  ]);
  assert.deepEqual(contexts.map(({ attempt }) => attempt), [1, 2, 3]);
  assert.deepEqual(delays, [10, 20]);
});

test('reconnects once before redispatching a disconnected read', async () => {
  let calls = 0;
  const reconnects = [];
  const transport = {
    async call() {
      calls += 1;
      if (calls < 3) {
        const error = new Error('connection closed');
        error.code = 'MCP_CONNECTION_CLOSED';
        throw error;
      }
      return 'reconnected';
    },
    async reconnect(context) {
      reconnects.push(context);
    }
  };

  const result = await dispatchToolRequest(READ_REQUEST, {
    transport,
    policy: POLICY,
    retry: { maxAttempts: 3, baseDelayMs: 0, maxDelayMs: 0 },
    sleep: NO_SLEEP
  });

  assert.equal(result, 'reconnected');
  assert.equal(calls, 3);
  assert.deepEqual(reconnects, [{ operationId: READ_REQUEST.operationId }]);
});

test('never automatically retries a mutating request', async () => {
  let calls = 0;
  const request = {
    operationId: 'op.termux.exec.0001',
    effect: 'execute',
    tool: 'termux.exec',
    input: { argv: ['true'] }
  };
  const transport = {
    async call() {
      calls += 1;
      const error = new Error('transport unavailable');
      error.code = 'MCP_TRANSPORT_UNAVAILABLE';
      throw error;
    },
    async reconnect() {
      assert.fail('mutating requests must not reconnect and replay automatically');
    }
  };

  await assert.rejects(
    dispatchToolRequest(request, {
      transport,
      policy: POLICY,
      retry: { maxAttempts: 5 },
      sleep: NO_SLEEP
    }),
    /transport unavailable/
  );
  assert.equal(calls, 1);
});

test('re-authorizes immediately before each retry', async () => {
  let authorizationChecks = 0;
  let calls = 0;
  const policy = {
    tools: POLICY.tools,
    authorize() {
      authorizationChecks += 1;
      return authorizationChecks === 1;
    }
  };
  const transport = {
    async call() {
      calls += 1;
      const error = new Error('temporary timeout');
      error.code = 'ETIMEDOUT';
      throw error;
    }
  };

  await assert.rejects(
    dispatchToolRequest(READ_REQUEST, {
      transport,
      policy,
      retry: { maxAttempts: 3, baseDelayMs: 0, maxDelayMs: 0 },
      sleep: NO_SLEEP
    }),
    /was not authorized/
  );
  assert.equal(authorizationChecks, 2);
  assert.equal(calls, 1);
});
