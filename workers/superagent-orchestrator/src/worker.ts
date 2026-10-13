// src/worker.ts
// ============================================================================
// SuperAgent Cloudflare Worker Orchestrator — Production-Ready
// Type-Safe | Structured Logging | Error Handling | Test-Gated Merges
// ============================================================================

// ── TYPES ──────────────────────────────────────────────────────────────────

/**
 * Merge job specification from GitHub webhook or API
 */
interface MergeJob {
  owner: string;
  repo: string;
  repoUrl: string;
  base: string;
  agentBranches: string[];
  runId: string;
  title: string;
}

/**
 * Result from merge operation on VM
 */
interface MergeResult {
  status: "green" | "merge_failed" | "tests_failed" | "no_tests" | "error";
  integration_branch: string;
  head_sha: string | null;
  merged: string[];
  conflicts: Array<{ branch: string; file: string; resolved: boolean }>;
  tests: {
    cmd: string;
    exit: number;
    passed: boolean;
    output_tail: string;
  } | null;
}

/**
 * GitHub PR creation payload
 */
interface GitHubPR {
  title: string;
  body: string;
  head: string;
  base: string;
  draft: boolean;
}

/**
 * Structured log entry
 */
interface LogEntry {
  timestamp: string;
  level: "info" | "error" | "debug" | "warn";
  message: string;
  context?: Record<string, unknown>;
}

/**
 * Worker environment bindings
 */
interface Env {
  TUNNEL_MERGE_HOST: string;
  CF_ACCESS_CLIENT_ID?: string;
  CF_ACCESS_CLIENT_SECRET?: string;
  MERGE_TOKEN: string;
  GITHUB_TOKEN: string;
  QUEUE: Queue<MergeJob>;
}

// ── LOGGER ─────────────────────────────────────────────────────────────────

/**
 * Structured JSON logger with timestamp, level, context
 */
class Logger {
  private context: Record<string, unknown>;

  constructor(context: Record<string, unknown> = {}) {
    this.context = context;
  }

  private log(level: LogEntry["level"], message: string, extra: Record<string, unknown> = {}) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context, ...extra },
    };
    console.log(JSON.stringify(entry));
  }

  info(msg: string, ctx?: Record<string, unknown>) {
    this.log("info", msg, ctx);
  }

  error(msg: string, ctx?: Record<string, unknown>) {
    this.log("error", msg, ctx);
  }

  debug(msg: string, ctx?: Record<string, unknown>) {
    this.log("debug", msg, ctx);
  }

  warn(msg: string, ctx?: Record<string, unknown>) {
    this.log("warn", msg, ctx);
  }
}

// ── ERRORS ─────────────────────────────────────────────────────────────────

class MergeError extends Error {
  constructor(message: string, public context: Record<string, unknown> = {}) {
    super(message);
    this.name = "MergeError";
  }
}

class GitHubError extends Error {
  constructor(message: string, public status: number, public context: Record<string, unknown> = {}) {
    super(message);
    this.name = "GitHubError";
  }
}

class TunnelError extends Error {
  constructor(message: string, public context: Record<string, unknown> = {}) {
    super(message);
    this.name = "TunnelError";
  }
}

// ── GITHUB API ─────────────────────────────────────────────────────────────

/**
 * GitHub REST API client with error handling + retry
 */
class GitHubClient {
  private readonly baseUrl = "https://api.github.com";
  private logger: Logger;

  constructor(private token: string, logger: Logger) {
    this.logger = logger;
  }

  /**
   * Execute GitHub API call with retry logic
   */
  private async callWithRetry<T>(
    method: string,
    path: string,
    body?: unknown,
    retries = 3
  ): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}${path}`, {
          method,
          headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "superagent-orchestrator/1.0.0",
            "Content-Type": "application/json",
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
          const errorText = await response.text();
          this.logger.error("GitHub API error", {
            method,
            path,
            status: response.status,
            attempt,
            error: errorText.slice(0, 200),
          });

          if (response.status === 429) {
            const retryAfter = parseInt(response.headers.get("Retry-After") || "60", 10);
            this.logger.warn("Rate limited, retrying", { retryAfter, attempt });
            await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
            continue;
          }

          throw new GitHubError(`${method} ${path} failed`, response.status, {
            errorText: errorText.slice(0, 500),
          });
        }

        return (await response.json()) as T;
      } catch (error) {
        if (error instanceof GitHubError) {
          throw error;
        }

        if (attempt === retries) {
          this.logger.error("GitHub API exhausted retries", { method, path, attempt, error: String(error) });
          throw error;
        }

        this.logger.debug("Retrying GitHub API call", { method, path, attempt });
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw new Error("Unreachable");
  }

  /**
   * Create a pull request
   */
  async createPullRequest(
    owner: string,
    repo: string,
    pr: GitHubPR
  ): Promise<{ number: number; html_url: string; node_id: string }> {
    this.logger.debug("Creating pull request", { owner, repo, title: pr.title });
    return this.callWithRetry("POST", `/repos/${owner}/${repo}/pulls`, pr);
  }

  /**
   * Enable auto-merge on a PR using its GraphQL node ID
   */
  async enableAutoMerge(owner: string, repo: string, prNodeId: string): Promise<void> {
    const query = `
      mutation EnableAutoMerge($pullRequestId: ID!) {
        enablePullRequestAutoMerge(input: { pullRequestId: $pullRequestId, mergeMethod: SQUASH }) {
          pullRequest {
            id
            autoMergeRequest {
              enabledAt
              mergeMethod
            }
          }
        }
      }
    `;

    this.logger.debug("Enabling auto-merge", { owner, repo, prNodeId });

    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        "User-Agent": "superagent-orchestrator/1.0.0",
      },
      body: JSON.stringify({ query, variables: { pullRequestId: prNodeId } }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new GitHubError("GraphQL auto-merge failed", response.status, {
        errorText: errorText.slice(0, 500),
      });
    }

    const data = (await response.json()) as {
      data?: { enablePullRequestAutoMerge?: { pullRequest: object | null } };
      errors?: Array<{ message: string }>;
    };

    if (data.errors?.length || !data.data?.enablePullRequestAutoMerge) {
      throw new GitHubError("GraphQL auto-merge mutation rejected", 200, {
        errors: data.errors?.map((e) => e.message),
      });
    }
  }

  /**
   * Get PR checks status
   */
  async getPRStatus(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<{
    mergeable: boolean;
    status_checks: Array<{ context: string; state: "pending" | "success" | "failure" }>;
  }> {
    this.logger.debug("Fetching PR status", { owner, repo, prNumber });

    const pr = await this.callWithRetry<{
      mergeable: boolean;
      head: { sha: string };
    }>("GET", `/repos/${owner}/${repo}/pulls/${prNumber}`);

    const combined = await this.callWithRetry<{
      statuses: Array<{ context: string; state: string }>;
    }>("GET", `/repos/${owner}/${repo}/commits/${pr.head.sha}/status`);

    return {
      mergeable: pr.mergeable,
      status_checks: combined.statuses.map((s) => ({
        context: s.context,
        state: s.state as "pending" | "success" | "failure",
      })),
    };
  }
}

// ── MERGE SERVER CLIENT ────────────────────────────────────────────────────

/**
 * Client for merge server running on VM (via CF Tunnel)
 */
class MergeServerClient {
  private logger: Logger;

  constructor(
    private host: string,
    private token: string,
    logger: Logger,
    private cfAccessClientId?: string,
    private cfAccessClientSecret?: string
  ) {
    this.logger = logger;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };

    if (this.cfAccessClientId && this.cfAccessClientSecret) {
      headers["CF-Access-Client-Id"] = this.cfAccessClientId;
      headers["CF-Access-Client-Secret"] = this.cfAccessClientSecret;
    }

    return headers;
  }

  /**
   * Submit merge job to VM and poll for result
   */
  async submitAndWait(job: MergeJob, timeoutMs = 600000): Promise<MergeResult> {
    this.logger.info("Submitting merge job to VM", { runId: job.runId, host: this.host });

    const url = `https://${this.host}/merge`;
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: this.buildHeaders(),
        body: JSON.stringify(job),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new TunnelError("Merge server returned error", {
          status: response.status,
          error: errorText.slice(0, 500),
        });
      }

      const result = (await response.json()) as MergeResult;
      const duration = Date.now() - startTime;

      this.logger.info("Merge job completed", {
        runId: job.runId,
        status: result.status,
        duration_ms: duration,
        head_sha: result.head_sha,
      });

      return result;
    } catch (error) {
      this.logger.error("Merge server communication failed", {
        runId: job.runId,
        error: String(error),
        duration_ms: Date.now() - startTime,
      });
      throw error;
    }
  }
}

// ── ORCHESTRATOR ───────────────────────────────────────────────────────────

/**
 * Main orchestration logic: accepts merge jobs, gates on tests, creates PRs
 */
class Orchestrator {
  private gh: GitHubClient;
  private merge: MergeServerClient;

  constructor(env: Env, logger: Logger) {
    this.gh = new GitHubClient(env.GITHUB_TOKEN, logger);
    this.merge = new MergeServerClient(
      env.TUNNEL_MERGE_HOST,
      env.MERGE_TOKEN,
      logger,
      env.CF_ACCESS_CLIENT_ID,
      env.CF_ACCESS_CLIENT_SECRET
    );
  }

  /**
   * Execute full merge + PR workflow
   */
  async processMergeJob(job: MergeJob): Promise<{ prNumber: number; url: string }> {
    const jobLogger = new Logger({ runId: job.runId, owner: job.owner, repo: job.repo });

    try {
      jobLogger.info("Starting merge workflow", { agentBranches: job.agentBranches.length });
      const mergeResult = await this.merge.submitAndWait(job);

      if (mergeResult.status === "tests_failed") {
        jobLogger.error("Tests failed, aborting PR creation", {
          status: mergeResult.status,
          test_output: mergeResult.tests?.output_tail,
        });
        throw new MergeError("Test gate blocked merge", {
          status: mergeResult.status,
          conflicts: mergeResult.conflicts.length,
        });
      }

      if (mergeResult.status === "merge_failed") {
        jobLogger.error("Merge failed (conflicts?)", {
          conflicts: mergeResult.conflicts,
        });
        throw new MergeError("Merge failed due to conflicts", {
          conflicts: mergeResult.conflicts,
        });
      }

      if (mergeResult.status === "error") {
        throw new MergeError("Merge server returned error state", {
          head_sha: mergeResult.head_sha,
        });
      }

      jobLogger.info("Merge successful, creating PR", {
        status: mergeResult.status,
        sha: mergeResult.head_sha,
        branch: mergeResult.integration_branch,
      });

      const prPayload: GitHubPR = {
        title: job.title,
        body: `## SuperAgent Merge Result\n\n**Status:** ${mergeResult.status}\n**SHA:** ${mergeResult.head_sha}\n**Branches merged:** ${mergeResult.merged.join(", ")}\n\n---\nAuto-generated by SuperAgent Orchestrator`,
        head: mergeResult.integration_branch,
        base: job.base,
        draft: false,
      };

      const prResponse = await this.gh.createPullRequest(job.owner, job.repo, prPayload);
      jobLogger.info("PR created successfully", {
        prNumber: prResponse.number,
        url: prResponse.html_url,
      });

      try {
        await this.gh.enableAutoMerge(job.owner, job.repo, prResponse.node_id);
        jobLogger.info("Auto-merge enabled", { prNumber: prResponse.number });
      } catch (error) {
        jobLogger.warn("Auto-merge setup failed (non-critical)", {
          error: String(error),
        });
      }

      return { prNumber: prResponse.number, url: prResponse.html_url };
    } catch (error) {
      jobLogger.error("Merge workflow failed", {
        error: String(error),
        errorName: error instanceof Error ? error.name : "Unknown",
      });
      throw error;
    }
  }
}

// ── WORKER HANDLER ────────────────────────────────────────────────────────

/**
 * Main Cloudflare Worker request handler
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const logger = new Logger({ method: request.method, url: request.url });

    try {
      const url = new URL(request.url);

      if (url.pathname === "/health") {
        return new Response(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.pathname === "/merge-job" && request.method === "POST") {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          logger.warn("Missing/invalid auth header");
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        const token = authHeader.slice(7);
        if (token !== env.MERGE_TOKEN && token !== env.GITHUB_TOKEN) {
          logger.warn("Invalid token");
          return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
        }

        let job: MergeJob;
        try {
          job = await request.json();
        } catch (error) {
          logger.error("Invalid JSON payload", { error: String(error) });
          return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
        }

        if (!job.owner || !job.repo || !job.base || !job.agentBranches || !job.runId) {
          logger.error("Missing required fields", { job });
          return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
        }

        try {
          await env.QUEUE.send(job);
        } catch (error) {
          logger.error("Queue send failed", { runId: job.runId, error: String(error) });
          return new Response(JSON.stringify({ error: "Queue unavailable" }), { status: 503 });
        }

        logger.info("Merge job queued", { runId: job.runId, branches: job.agentBranches.length });
        return new Response(
          JSON.stringify({ status: "queued", runId: job.runId, message: "Job enqueued for processing" }),
          {
            status: 202,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      logger.warn("Not found", { pathname: url.pathname });
      return new Response(JSON.stringify({ error: "Not Found" }), { status: 404 });
    } catch (error) {
      logger.error("Unhandled worker error", { error: String(error) });
      return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
    }
  },

  async queue(batch: MessageBatch<MergeJob>, env: Env): Promise<void> {
    const logger = new Logger({ handler: "queue" });

    for (const message of batch.messages) {
      const job = message.body;
      const jobLogger = new Logger({ runId: job.runId, handler: "queue" });

      try {
        const orchestrator = new Orchestrator(env, jobLogger);
        const { prNumber, url } = await orchestrator.processMergeJob(job);

        jobLogger.info("Merge job completed successfully", { prNumber, url });
        message.ack();
      } catch (error) {
        jobLogger.error("Merge job failed", {
          error: String(error),
          errorType: error instanceof Error ? error.constructor.name : "Unknown",
        });

        if (message.attempts > 3) {
          jobLogger.error("Max retries exceeded, dead-lettering job", { attempts: message.attempts });
          message.ack();
        } else {
          message.retry();
        }
      }
    }
  },

  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    const logger = new Logger({ handler: "scheduled", cron: event.cron });
    logger.info("Scheduled job triggered");
  },
};
