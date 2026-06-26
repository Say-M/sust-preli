import { HTTPException } from "hono/http-exception";
import type { HealthResponse } from "./health.schema";

function isApiKeyConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function checkHealth(): HealthResponse {
  if (!isApiKeyConfigured()) {
    throw new HTTPException(503, {
      message: "OPENAI_API_KEY is not configured",
    });
  }

  return { status: "ok" };
}
