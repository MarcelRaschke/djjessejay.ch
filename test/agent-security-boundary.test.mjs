import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  ToolRequestDeniedError,
  assertToolRequestIsSafe,
  dispatchToolRequest
} from '../src/agent/mcp-boundary.mjs';

const READ_REQUEST = Object.freeze({
  operationId: 'op.security.boundary.0001',
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

function makeTransport(onCall = () => {}) {
  return {
    async call(tool, input, context) {
      onCall({ tool, input, context });
      return { ok: true };
    }
  };
}

test('AGENT-SEC-01: model cannot authorize itself', async () => {
  let transportCalls = 0;
  const policy = {
    tools: POLICY.tools,
    authorize: () => false
  };
  const modelRequest = {
    ...READ_REQUEST,
    input: { ...READ_REQUEST.input, authorize: true, permission: 'admin' }
  };

  await assert.rejects(
    dispatchToolRequest(modelRequest, {
      policy,
      transport: makeTransport(() => { transportCalls += 1; }),
      sleep: NO_SLEEP
    }),
    ToolRequestDeniedError
  );
  assert.equal(transportCalls, 0);
});

test('AGENT-SEC-02: capability requires explicit permission', () => {
  assert.throws(
    () => assertToolRequestIsSafe({
      ...READ_REQUEST,
      tool: 'mcp.unlisted.tool'
    }, POLICY),
    /not allowlisted/
  );
});

test('AGENT-SEC-03: secrets are absent from model/tool context', () => {
  assert.throws(
    () => assertToolRequestIsSafe({
      ...READ_REQUEST,
      input: { ...READ_REQUEST.input, api_key: 'test-secret' }
    }, POLICY),
    /credential-shaped key/
  );
});

test('AGENT-SEC-04: audit/dispatch context contains no secret material', async () => {
  const captured = [];
  await dispatchToolRequest(READ_REQUEST, {
    policy: POLICY,
    transport: makeTransport((event) => captured.push(event)),
    sleep: NO_SLEEP
  });

  assert.equal(captured.length, 1);
  const serialized = JSON.stringify(captured[0]);
  assert.doesNotMatch(serialized, /api[_-]?key|secret|token|private[_-]?key/i);
});

test('AGENT-SEC-05: authorization precedes external dispatch', async () => {
  const events = [];
  const policy = {
    tools: POLICY.tools,
    authorize: () => {
      events.push('authorize');
      return true;
    }
  };

  await dispatchToolRequest(READ_REQUEST, {
    policy,
    transport: makeTransport(() => events.push('dispatch')),
    sleep: NO_SLEEP
  });

  assert.deepEqual(events, ['authorize', 'dispatch']);
});

test('AGENT-SEC-06: retry/reconnect preserves authorization', async () => {
  const authorizations = [];
  const contexts = [];
  let calls = 0;
  const policy = {
    tools: POLICY.tools,
    authorize(request) {
      authorizations.push(request.operationId);
      return true;
    }
  };
  const transport = {
    async call(_tool, _input, context) {
      contexts.push(context);
      calls += 1;
      if (calls === 1) {
        const error = new Error('connection closed');
        error.code = 'MCP_CONNECTION_CLOSED';
        throw error;
      }
      return 'ok';
    },
    async reconnect(context) {
      assert.equal(context.operationId, READ_REQUEST.operationId);
    }
  };

  await dispatchToolRequest(READ_REQUEST, {
    policy,
    transport,
    retry: { maxAttempts: 2, baseDelayMs: 0, maxDelayMs: 0 },
    sleep: NO_SLEEP
  });

  assert.deepEqual(authorizations, [READ_REQUEST.operationId, READ_REQUEST.operationId]);
  assert.deepEqual(contexts.map(({ operationId }) => operationId), [
    READ_REQUEST.operationId,
    READ_REQUEST.operationId
  ]);
});

test('AGENT-SEC-07: provider credentials are runtime-injected, not request-injected', () => {
  const source = fs.readFileSync('src/agent/mcp-boundary.mjs', 'utf8');
  assert.doesNotMatch(source, /request\.(input|params|arguments).*api[_-]?key/i);
  assert.doesNotMatch(source, /request\.(input|params|arguments).*secret/i);
});

test('AGENT-SEC-08: hard-coded secret patterns are rejected by the gate', () => {
  const source = fs.readFileSync('scripts/check-agent-security-boundary.sh', 'utf8');
  assert.match(source, /AKIA/);
  assert.match(source, /ghp_/);
  assert.match(source, /PRIVATE KEY/);
});

test('AGENT-SEC-09: unknown operations fail closed', async () => {
  let calls = 0;
  await assert.rejects(
    dispatchToolRequest({
      ...READ_REQUEST,
      tool: 'etherscan.unknown.operation'
    }, {
      policy: POLICY,
      transport: makeTransport(() => { calls += 1; }),
      sleep: NO_SLEEP
    }),
    /not allowlisted/
  );
  assert.equal(calls, 0);
});

test('AGENT-SEC-10: operationId survives request → retry → dispatch', async () => {
  const seen = [];
  let calls = 0;
  const transport = {
    async call(_tool, _input, context) {
      seen.push(context.operationId);
      calls += 1;
      if (calls === 1) {
        const error = new Error('temporary timeout');
        error.code = 'ETIMEDOUT';
        throw error;
      }
      return 'ok';
    }
  };

  await dispatchToolRequest(READ_REQUEST, {
    policy: POLICY,
    transport,
    retry: { maxAttempts: 2, baseDelayMs: 0, maxDelayMs: 0 },
    sleep: NO_SLEEP
  });

  assert.deepEqual(seen, [
    READ_REQUEST.operationId,
    READ_REQUEST.operationId
  ]);
});
