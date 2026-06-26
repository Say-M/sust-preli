import { HTTPException } from "hono/http-exception";
import type { HealthResponse } from "./health.schema";
import { healthGauge } from "./health.metrics";

function isApiKeyConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function refreshHealthMetric(): void {
  healthGauge.set(isApiKeyConfigured() ? 1 : 0);
}

export function checkHealth(): HealthResponse {
  if (!isApiKeyConfigured()) {
    healthGauge.set(0);
    throw new HTTPException(503, {
      message: "OPENAI_API_KEY is not configured",
    });
  }

  healthGauge.set(1);
  return { status: "ok" };
}
