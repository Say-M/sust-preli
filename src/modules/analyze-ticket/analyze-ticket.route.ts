import { Hono } from "hono";
import { describeRoute, validator, resolver } from "hono-openapi";
import {
  analyzeTicketInputSchema,
  analyzeTicketOutputSchema,
} from "./analyze-ticket.schema";
import { errorResponseSchema } from "../../common/schema";
import { HTTPException } from "hono/http-exception";

const app = new Hono();

app.post(
  "/analyze-ticket",
  describeRoute({
    tags: ["Analyze Ticket"],
    summary: "Analyze a ticket",
    responses: {
      200: {
        description: "OK",
        content: {
          "application/json": { schema: resolver(analyzeTicketOutputSchema) },
        },
      },
      400: {
        description: "Bad Request",
        content: {
          "application/json": { schema: resolver(errorResponseSchema) },
        },
      },
      422: {
        description: "Unprocessable Entity",
        content: {
          "application/json": { schema: resolver(errorResponseSchema) },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": { schema: resolver(errorResponseSchema) },
        },
      },
    },
  }),
  validator("json", analyzeTicketInputSchema, (result) => {
    if (!result.success) {
      if (!result.success) {
        let message = "";
        result.error.forEach((error) => {
          message += error.message + "\n";
        });
        message = message.trim();
        if (!message) message = "Something went wrong";

        throw new HTTPException(422, { message });
      }
    }
  }),
  async (c) => {
    const input = c.req.valid("json");
    return c.json({ message: "Ticket analyzed successfully" });
  },
);

export default app;
