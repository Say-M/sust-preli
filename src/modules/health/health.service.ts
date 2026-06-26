import { HTTPException } from "hono/http-exception";
import type { HealthResponse } from "./health.schema";

export function checkHealth(): HealthResponse {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new HTTPException(503, {
      message: "OPENAI_API_KEY is not configured",
    });
  }

  return { status: "ok" };
}
