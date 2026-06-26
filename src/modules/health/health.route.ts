import { Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import { healthResponseSchema } from "./health.schema";
import { errorResponseSchema } from "../../common/schema";

const app = new Hono();

app.get(
  "/health",
  describeRoute({
    tags: ["Health"],
    summary: "Check health of the server",
    responses: {
      200: {
        description: "OK",
        content: {
          "application/json": { schema: resolver(healthResponseSchema) },
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
    return c.json({ status: "ok" });
  },
);

export default app;
