import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const workerDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const workerFile = path.join(workerDir, "src", "skillgenerator.js");

const RATE_LIMIT_MAX_REQUESTS = 30;

function makeRequest(method, pathname, body, ip = "203.0.113.10") {
  return new Request(`https://skillgenerator.example${pathname}`, {
    method,
    headers: { "CF-Connecting-IP": ip },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function loadWorker() {
  const mod = await import(workerFile);
  return mod.default;
}

const envWithMock = { DEPLOYMENT_ENV: "preview" };

test("gap-analysis berechnet match_percentage und missing_skills", async () => {
  const worker = await loadWorker();
  const res = await worker.fetch(
    makeRequest("POST", "/api/v1/gap-analysis", {
      user_skills: ["JavaScript", "Cloudflare Workers"],
      target_role_requirements: ["javascript", "Kubernetes", "Terraform"],
    }),
    envWithMock,
    {}
  );
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.match_percentage, 33.33);
  assert.deepEqual(data.missing_skills, ["kubernetes", "terraform"]);
  assert.equal(data.gap_metric_delta_s, 0.67);
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), "https://skillgenerator.example");
});

test("extract-skills fällt ohne OPENAI_API_KEY auf Mock-Daten zurück", async () => {
  const worker = await loadWorker();
  const res = await worker.fetch(
    makeRequest("POST", "/api/v1/extract-skills", { input_text: "Lebenslauf…" }),
    envWithMock,
    {}
  );
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.technical_skills));
  assert.ok(data.technical_skills.length > 0);
  assert.ok(Array.isArray(data.soft_skills));
  assert.ok(Array.isArray(data.domain_keywords));
});

test("OPTIONS beantwortet CORS-Preflight", async () => {
  const worker = await loadWorker();
  const res = await worker.fetch(makeRequest("OPTIONS", "/api/v1/extract-skills", undefined), envWithMock, {});
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Access-Control-Allow-Methods"), "POST, OPTIONS");
  assert.equal(res.headers.get("Access-Control-Max-Age"), "86400");
});

test("unbekannte Route liefert 404", async () => {
  const worker = await loadWorker();
  const res = await worker.fetch(makeRequest("POST", "/api/v1/nope", {}), envWithMock, {});
  assert.equal(res.status, 404);
});

test("Security-Header sind auf jeder Antwort gesetzt", async () => {
  const worker = await loadWorker();
  const res = await worker.fetch(makeRequest("POST", "/api/v1/gap-analysis", {
    user_skills: ["a"],
    target_role_requirements: ["a"],
  }), envWithMock, {});
  assert.equal(res.headers.get("X-Content-Type-Options"), "nosniff");
  assert.ok(res.headers.get("Strict-Transport-Security").includes("max-age=31536000"));
  assert.equal(res.headers.get("X-Robots-Tag"), "noindex, nofollow");
  assert.ok(res.headers.get("Content-Security-Policy").includes("default-src 'none'"));
});

test("Rate-Limit liefert 429 nach Überschreitung des Limits", async () => {
  const worker = await loadWorker();
  const ip = "198.51.100.77";
  let last;
  for (let i = 0; i <= RATE_LIMIT_MAX_REQUESTS; i += 1) {
    last = await worker.fetch(makeRequest("POST", "/api/v1/gap-analysis", {
      user_skills: ["a"],
      target_role_requirements: ["a"],
    }, ip), envWithMock, {});
  }
  assert.equal(last.status, 429);
  assert.equal(last.headers.get("Retry-After"), "60");
  assert.equal(last.headers.get("X-RateLimit-Remaining"), "0");
});

test("CORS_ALLOW_ORIGIN überschreibt die Default-Origin", async () => {
  const worker = await loadWorker();
  const res = await worker.fetch(makeRequest("POST", "/api/v1/gap-analysis", {
    user_skills: ["a"],
    target_role_requirements: ["a"],
  }), { ...envWithMock, CORS_ALLOW_ORIGIN: "https://djjessejay.ch" }, {});
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), "https://djjessejay.ch");
});

test("worker Datei ist syntaktisch valide", () => {
  execFileSync("node", ["--check", workerFile]);
});
