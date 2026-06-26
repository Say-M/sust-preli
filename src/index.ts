import { Hono } from "hono";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { bodyLimit } from "hono/body-limit";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { HTTPException } from "hono/http-exception";

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

app.get("/health", (c) => {
  return c.text("Hello Hono!");
});

export default app;
