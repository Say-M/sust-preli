import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { analyzeTicketInputSchema } from "./analyze-ticket.schema";

const app = new Hono();

app.post(
  "/analyze-ticket",
  zValidator("json", analyzeTicketInputSchema),
  async (c) => {
    const input = c.req.valid("json");
    return c.json({ message: "Ticket analyzed successfully" });
  },
);

export default app;
