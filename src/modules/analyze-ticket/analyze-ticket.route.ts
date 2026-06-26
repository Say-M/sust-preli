import { Hono } from "hono";
import { describeRoute, validator, resolver } from "hono-openapi";
import {
  analyzeTicketInputSchema,
  analyzeTicketOutputSchema,
} from "./analyze-ticket.schema";
import { errorResponseSchema } from "../../common/schema";

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
  // validator("json", analyzeTicketInputSchema),
  async (c) => {
    // const input = c.req.valid("json");
    return c.json({ message: "Ticket analyzed successfully" });
  },
);

export default app;
