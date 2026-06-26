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
import { ZodError } from "zod";

const app = new Hono();

app.use(requestId());

app.use(secureHeaders());

app.onError((error, c) => {
  let status: ContentfulStatusCode = 500;
  let message = "Internal server error";
  const timestamp = new Date().toISOString();

  if (error instanceof HTTPException) {
    status = error.status;
    message = error.message;
  } else if (error instanceof ZodError) {
    message = error.message;
    status = 400;
  } else {
    message = error?.message || "Internal server error";
    status = 500;
  }
  return c.json({ message, error, timestamp }, status);
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
          error: "Request body too large",
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
        title: "Backend API",
        version: "1.0.0",
        description: "Backend API",
      },
      servers: [{ url: process.env.SERVER_URL!, description: "Local Server" }],
    },
  }),
);

app.get("/docs", Scalar({ url: "/openapi", theme: "purple" }));

app.route("", healthRoute);
app.route("", analyzeTicketRoute);

export default app;
