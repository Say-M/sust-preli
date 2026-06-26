import { analyzeTicket } from "../../agents/investigator";
import type {
  AnalyzeTicketInput,
  AnalyzeTicketOutput,
} from "./analyze-ticket.schema";

/**
 * Thin service seam — no business logic lives here.
 * Call path: route → service → investigator.
 */
export async function analyzeTicketService(
  input: AnalyzeTicketInput,
): Promise<AnalyzeTicketOutput> {
  return analyzeTicket(input);
}
