import { Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import { healthResponseSchema } from "./health.schema";
import { errorResponseSchema } from "../../common/schema";
import { register } from "./health.metrics";
import { checkHealth, refreshHealthMetric } from "./health.service";

const app = new Hono();

app.get(
  "/health",
  describeRoute({
    tags: ["Health"],
    summary: "Check health of the server",
    responses: {
      200: {
        description: "OK — OPENAI_API_KEY is configured",
        content: {
          "application/json": { schema: resolver(healthResponseSchema) },
        },
      },
      503: {
        description: "Service unavailable — OPENAI_API_KEY is missing",
        content: {
          "application/json": {
            schema: resolver(errorResponseSchema),
          },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: resolver(errorResponseSchema),
          },
        },
      },
    },
  }),
  (c) => {
    const health = checkHealth();
    return c.json(health);
  },
);

app.get("/metrics", async (c) => {
  refreshHealthMetric();
  const metrics = await register.metrics();
  return c.body(metrics, 200, {
    "Content-Type": register.contentType,
  });
});

export default app;
