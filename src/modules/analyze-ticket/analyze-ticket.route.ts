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
<<<<<<< Updated upstream
  validator("json", analyzeTicketInputSchema, (result, c) => {
    if (!result.success) {
      let message = "";
      result.error.forEach((error) => {
        message += error.message + "\n";
      });
      message = message.trim();
      if (!message) message = "Something went wrong";

=======
  async (c) => {
    try {
      let rawBody: unknown;
      try {
        rawBody = await c.req.json();
      } catch {
        return c.json(
          {
            message: "Invalid JSON in request body",
            timestamp: new Date().toISOString(),
          },
          400,
        );
      }

      if (!rawBody || typeof rawBody !== "object") {
        return c.json(
          {
            message: "Request body must be a JSON object",
            timestamp: new Date().toISOString(),
          },
          400,
        );
      }

      const body = rawBody as Record<string, unknown>;

      if ("complaint" in body && body.complaint === "") {
        return c.json(
          {
            message: "Complaint must not be empty",
            timestamp: new Date().toISOString(),
          },
          422,
        );
      }

      // Validate top-level fields strictly, but safe-parse transaction_history
      // entry-by-entry and DROP invalid entries rather than 400-ing the whole ticket.
      let tolerantBody = { ...body };

      if (Array.isArray(body.transaction_history)) {
        const validTransactions: unknown[] = [];
        for (const entry of body.transaction_history) {
          const result = transactionSchema.safeParse(entry);
          if (result.success) {
            validTransactions.push(result.data);
          }
          // Invalid entries are silently dropped — the matcher treats
          // empty/partial history as insufficient_data, so this degrades gracefully.
        }
        tolerantBody = { ...body, transaction_history: validTransactions };
      }

      const parseResult = analyzeTicketInputSchema.safeParse(tolerantBody);

      if (!parseResult.success) {
        const issues = parseResult.error;
        let message = "Validation failed";

        if (issues && Array.isArray(issues)) {
          const msgs = issues
            .map((issue: { message?: string }) => issue.message)
            .filter(Boolean);
          if (msgs.length > 0) {
            message = msgs.join("; ");
          }
        }

        return c.json(
          {
            message,
            timestamp: new Date().toISOString(),
          },
          400,
        );
      }

      const validatedInput: AnalyzeTicketInput = parseResult.data;

      const result = await analyzeTicketService(validatedInput);
      return c.json(result, 200);
    } catch (error) {
      console.error("[analyze-ticket.route] Unexpected error:", (error as Error)?.message ?? "unknown");
>>>>>>> Stashed changes
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
