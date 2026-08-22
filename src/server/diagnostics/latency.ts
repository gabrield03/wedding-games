import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

export const LATENCY_DIAGNOSTIC_HEADER = "x-wedding-games-diagnostic-id";

type LatencyContext = {
  operation: string;
  outcome?: string;
  requestId: string;
  stages: Record<string, number>;
};

type LatencyLog = {
  event: "connections_latency";
  operation: string;
  outcome?: string;
  requestId?: string;
  statusCode?: number;
  totalMs: number;
  stages?: Record<string, number>;
  vercelId?: string;
  vercelRegion?: string;
};

const latencyStorage = new AsyncLocalStorage<LatencyContext>();

export async function withLatencyDiagnostic(
  operation: string,
  request: Request | undefined,
  handler: () => Promise<Response>,
): Promise<Response> {
  const context: LatencyContext = {
    operation,
    requestId: randomUUID(),
    stages: {},
  };
  const startedAt = performance.now();
  let statusCode = 500;

  try {
    const response = await latencyStorage.run(context, handler);
    statusCode = response.status;
    response.headers.set(LATENCY_DIAGNOSTIC_HEADER, context.requestId);

    return response;
  } finally {
    logLatency({
      operation,
      outcome: context.outcome,
      requestId: context.requestId,
      statusCode,
      totalMs: elapsedMilliseconds(startedAt),
      stages: roundStages(context.stages),
      ...getVercelMetadata(request),
    });
  }
}

export async function measureLatencyStage<T>(
  stage: string,
  operation: () => PromiseLike<T> | Promise<T>,
): Promise<T> {
  const context = latencyStorage.getStore();

  if (!context) {
    return await operation();
  }

  const startedAt = performance.now();

  try {
    return await operation();
  } finally {
    addStageDuration(context, stage, elapsedMilliseconds(startedAt));
  }
}

export function measureLatencyStageSync<T>(
  stage: string,
  operation: () => T,
): T {
  const context = latencyStorage.getStore();

  if (!context) {
    return operation();
  }

  const startedAt = performance.now();

  try {
    return operation();
  } finally {
    addStageDuration(context, stage, elapsedMilliseconds(startedAt));
  }
}

export function setLatencyOutcome(outcome: string) {
  const context = latencyStorage.getStore();

  if (context) {
    context.outcome = outcome;
  }
}

export function logStandaloneLatency({
  operation,
  outcome,
  request,
  totalMs,
}: {
  operation: string;
  outcome?: string;
  request: Request | undefined;
  totalMs: number;
}) {
  logLatency({
    operation,
    outcome,
    totalMs: Math.round(totalMs),
    ...getVercelMetadata(request),
  });
}

function addStageDuration(
  context: LatencyContext,
  stage: string,
  duration: number,
) {
  context.stages[stage] = (context.stages[stage] ?? 0) + duration;
}

function elapsedMilliseconds(startedAt: number) {
  return performance.now() - startedAt;
}

function roundStages(stages: Record<string, number>) {
  return Object.fromEntries(
    Object.entries(stages).map(([stage, duration]) => [
      stage,
      Math.round(duration),
    ]),
  );
}

function getVercelMetadata(request: Request | undefined) {
  const vercelId = request?.headers?.get("x-vercel-id")?.trim();
  const vercelRegion = process.env.VERCEL_REGION?.trim();

  return {
    ...(vercelId ? { vercelId } : {}),
    ...(vercelRegion ? { vercelRegion } : {}),
  };
}

function logLatency(input: Omit<LatencyLog, "event">) {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  console.info(
    JSON.stringify({
      event: "connections_latency",
      ...input,
    } satisfies LatencyLog),
  );
}
