export type ToolEffect = 'read' | 'write' | 'execute' | 'delete';

export interface InternalToolRequest<
  TInput extends Record<string, unknown> = Record<string, unknown>
> {
  /** Stable identifier retained across authorization, retries and audit logs. */
  operationId: string;
  /** Declared side-effect class; it must match the per-tool policy. */
  effect: ToolEffect;
  tool: string;
  input: TInput;
}

export interface ToolPolicy {
  tools: Readonly<Record<string, readonly ToolEffect[]>>;
  authorize?: (request: InternalToolRequest) => boolean;
}

export interface ToolDispatchContext {
  operationId: string;
  effect: ToolEffect;
  attempt: number;
}

export interface McpTransport {
  call(
    tool: string,
    input: Record<string, unknown>,
    context: ToolDispatchContext
  ): Promise<unknown>;
  reconnect?(context: { operationId: string }): Promise<void>;
}

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export interface DispatchOptions {
  transport: McpTransport;
  policy: ToolPolicy;
  retry?: RetryOptions;
  sleep?: (delayMs: number) => Promise<void>;
}

export class ToolRequestDeniedError extends Error {
  code: 'TOOL_REQUEST_DENIED';
}

export function assertToolRequestIsSafe(
  request: InternalToolRequest,
  policy: ToolPolicy
): InternalToolRequest;

export function dispatchToolRequest(
  request: InternalToolRequest,
  options: DispatchOptions
): Promise<unknown>;
