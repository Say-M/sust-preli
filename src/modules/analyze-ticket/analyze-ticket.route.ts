import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import {
  analyzeTicketInputSchema,
  analyzeTicketOutputSchema,
  transactionSchema,
  type AnalyzeTicketInput,
} from "./analyze-ticket.schema";
import { errorResponseSchema } from "../../common/schema";
import { analyzeTicketService } from "./analyze-ticket.service";

const app = new Hono();

app.post(
  "/analyze-ticket",
  describeRoute({
    tags: ["Analyze Ticket"],
    summary:
      "Analyze a support ticket using deterministic rules + optional LLM classification",
    responses: {
      200: {
        description: "Ticket analyzed successfully",
        content: {
          "application/json": { schema: resolver(analyzeTicketOutputSchema) },
        },
      },
      400: {
        description: "Bad Request — invalid JSON or missing required fields",
        content: {
          "application/json": { schema: resolver(errorResponseSchema) },
        },
      },
      422: {
        description:
          "Unprocessable Entity — empty complaint or semantic validation failure",
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
  validator("json", analyzeTicketInputSchema, (result, c) => {
    if (!result.success) {
      let message = "";
      result.error.forEach((error) => {
        message += error.message + "\n";
      });
      message = message.trim();
      if (!message) message = "Something went wrong";

      return c.json(
        {
          message,
          error: result.error,
          timestamp: new Date().toISOString(),
        },
        422,
      );
    }
  }),
  async (c) => {
    const input = c.req.valid("json");

    const result = await analyzeTicketService(input);
    return c.json(result, 200);
  },
);

export default app;
