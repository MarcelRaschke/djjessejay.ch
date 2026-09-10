/**
 * FAULI // CHILL PROTOCOL
 * Architecture/Security Boundary Tests
 *
 * Invariant:
 *   Visual State != Audio Authority != System Authority
 *
 * These tests deliberately use a minimal browser-like harness. FAULI must
 * remain incapable of mutating an audio BPM state through its public API.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../js/fauli.js', import.meta.url), 'utf8');

function createHarness(audioBpm = 128) {
  const listeners = new Map();
  const html = {
    dataset: {},
    style: { setProperty() {} }
  };

  const body = {
    appendChild(node) {
      node.parentNode = body;
    }
  };

  const document = {
    readyState: 'complete',
    documentElement: html,
    body,
    head: { appendChild() {} },
    getElementById() { return null; },
    createElement() {
      return {
        style: { textContent: '' },
        dataset: {},
        setAttribute() {},
        appendChild() {}
      };
    },
    addEventListener() {}
  };

  const window = {
    matchMedia: () => ({ matches: false }),
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(handler);
    },
    dispatchEvent() { return true; },
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) {
        this.type = type;
        this.detail = init.detail;
      }
    }
  };

  const context = vm.createContext({ window, document });
  vm.runInContext(source, context, { filename: 'fauli.js' });

  return {
    FAULI: context.window.FAULI,
    audio: { bpm: audioBpm },
    html
  };
}

test('FAULI exposes a visual-state-only API', () => {
  const { FAULI } = createHarness();
  assert.deepEqual(Object.keys(FAULI).sort(), ['STATES', 'getSnapshot', 'getState', 'render', 'setState'].sort());
});

test('CHILL state is deterministic and canonical', () => {
  const { FAULI } = createHarness();
  FAULI.setState(FAULI.STATES.CHILL);

  assert.deepEqual(FAULI.getSnapshot(), {
    stability: 100,
    visualBpm: 0.5,
    signal: '97.5 MHz',
    overdrive: 'SUPPRESSED',
    status: 'STABLE',
    mode: 'CHILL',
    control: 'ACTIVE',
    kineticLoad: 'DAMPED',
    network: 'NOMINAL'
  });
});

test('negative boundary: FAULI visualBpm cannot change audio BPM', () => {
  const { FAULI, audio } = createHarness(128);
  const before = audio.bpm;

  FAULI.setState(FAULI.STATES.CHILL);

  assert.equal(FAULI.getSnapshot().visualBpm, 0.5);
  assert.equal(audio.bpm, before);
});

test('negative boundary: render cannot mutate audio state', () => {
  const { FAULI, audio } = createHarness(132);
  const before = structuredClone(audio);

  FAULI.render(FAULI.STATES.CHILL);

  assert.deepEqual(audio, before);
});

test('determinism: same initial state + same transition sequence = same final snapshot', () => {
  const a = createHarness();
  const b = createHarness();

  for (const state of [a.FAULI.STATES.CHILL, a.FAULI.STATES.NORMAL, a.FAULI.STATES.CHILL]) {
    a.FAULI.setState(state);
  }
  for (const state of [b.FAULI.STATES.CHILL, b.FAULI.STATES.NORMAL, b.FAULI.STATES.CHILL]) {
    b.FAULI.setState(state);
  }

  assert.deepEqual(a.FAULI.getSnapshot(), b.FAULI.getSnapshot());
  assert.equal(a.audio.bpm, b.audio.bpm);
});
