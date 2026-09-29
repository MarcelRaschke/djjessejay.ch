import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ToolRequestDeniedError,
  assertToolRequestIsSafe,
  dispatchToolRequest
} from '../src/agent/mcp-boundary.mjs';

const READ_REQUEST = Object.freeze({
  operationId: 'op.mw.boundary.0001',
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

test('MW-BOUNDARY-01: proposal cannot self-authorize execution', async () => {
  let dispatches = 0;
  const policy = {
    tools: POLICY.tools,
    authorize: () => false
  };

  await assert.rejects(
    dispatchToolRequest({
      ...READ_REQUEST,
      outputClass: 'PROPOSAL',
      authorization: 'ALLOW'
    }, {
      policy,
      transport: makeTransport(() => { dispatches += 1; }),
      sleep: NO_SLEEP
    }),
    ToolRequestDeniedError
  );

  assert.equal(dispatches, 0);
});

test('MW-BOUNDARY-01: capability cannot grant authorization', async () => {
  let dispatches = 0;

  await assert.rejects(
    dispatchToolRequest({
      ...READ_REQUEST,
      capability: ['can_execute'],
      permission: ['execute']
    }, {
      policy: POLICY,
      transport: makeTransport(() => { dispatches += 1; }),
      sleep: NO_SLEEP
    }),
    ToolRequestDeniedError
  );

  assert.equal(dispatches, 0);
});

for (const sourceClass of ['EVIDENCE', 'PROVENANCE', 'CONFIDENCE']) {
  test(`MW-BOUNDARY-01: ${sourceClass} cannot grant authorization`, async () => {
    let dispatches = 0;
    const policy = {
      tools: POLICY.tools,
      authorize: () => false
    };

    await assert.rejects(
      dispatchToolRequest({
        ...READ_REQUEST,
        [sourceClass.toLowerCase()]: {
          class: sourceClass,
          value: 'trusted',
          authorization: 'ALLOW'
        }
      }, {
        policy,
        transport: makeTransport(() => { dispatches += 1; }),
        sleep: NO_SLEEP
      }),
      ToolRequestDeniedError
    );

    assert.equal(dispatches, 0);
  });
}

test('MW-BOUNDARY-01: authorization denial cannot reach execution', async () => {
  let dispatches = 0;

  assert.throws(
    () => assertToolRequestIsSafe(READ_REQUEST, {
      tools: POLICY.tools,
      authorize: () => false
    }),
    ToolRequestDeniedError
  );

  await assert.rejects(
    dispatchToolRequest(READ_REQUEST, {
      policy: {
        tools: POLICY.tools,
        authorize: () => false
      },
      transport: makeTransport(() => { dispatches += 1; }),
      sleep: NO_SLEEP
    }),
    ToolRequestDeniedError
  );

  assert.equal(dispatches, 0);
});

test('MW-BOUNDARY-01: only governance, eligibility and authorization gates can permit execution', async () => {
  const dispatches = [];

  const policy = {
    tools: POLICY.tools,
    authorize(request) {
      return request.governance === 'PASS'
        && request.eligibility === 'PASS'
        && request.authorization === 'ALLOW';
    }
  };

  await dispatchToolRequest({
    ...READ_REQUEST,
    governance: 'PASS',
    eligibility: 'PASS',
    authorization: 'ALLOW'
  }, {
    policy,
    transport: makeTransport((event) => dispatches.push(event)),
    sleep: NO_SLEEP
  });

  assert.equal(dispatches.length, 1);
});
