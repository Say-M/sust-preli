import { Hono } from "hono";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { bodyLimit } from "hono/body-limit";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { HTTPException } from "hono/http-exception";
import { openAPIRouteHandler } from "hono-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import healthRoute from "./modules/health/health.route";
import analyzeTicketRoute from "./modules/analyze-ticket/analyze-ticket.route";

const app = new Hono();

app.use(requestId());

app.use(secureHeaders());

app.onError((error, c) => {
  let status: ContentfulStatusCode = 500;
  let message = "Internal server error";
  const timestamp = new Date().toISOString();
  console.error("[global error handler]", error?.message ?? "unknown error");

  if (error instanceof HTTPException) {
    status = error.status;
    message = error.message;
  } else {
    // Unknown errors → 500 with safe body. Never leak stack traces, tokens, or secrets.
    message = "Internal server error";
    status = 500;
  }

  return c.json({ message, timestamp }, status);
});

app.notFound((c) => {
  const status = 404;
  const message = "Not found";
  const timestamp = new Date().toISOString();
  return c.json({ message, timestamp }, status);
});

app.use(
  "*",
  bodyLimit({
    maxSize: 1024 * 1024 * 20, // 20MB
    onError(c) {
      return c.json(
        {
          message: "Request body too large",
          timestamp: new Date().toISOString(),
        },
        413,
      );
    },
  }),
);

app.get(
  "/openapi",
  openAPIRouteHandler(app, {
    documentation: {
      info: {
        title: "Support Ticket Analysis API",
        version: "1.0.0",
        description:
          "Deterministic-first support ticket triage API for digital finance platforms. Rules decide; LLM only refines case_type and drafts agent_summary.",
      },
      servers: [
        {
          url: process.env.SERVER_URL || "http://localhost:3000",
          description: "Server",
        },
      ],
    },
  }),
);

app.get("/docs", Scalar({ url: "/openapi", theme: "purple" }));

app.route("", healthRoute);
app.route("", analyzeTicketRoute);

const PORT = parseInt(process.env.PORT || "3000", 10);

export default {
  port: PORT,
  hostname: "0.0.0.0",
  fetch: app.fetch,
};
