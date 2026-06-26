import {
  AnalyzeTicketOutput,
  Language,
  analyzeTicketOutputSchema,
} from "../modules/analyze-ticket/analyze-ticket.schema";
import { buildNextAction, buildReply } from "./routing";

/** Patterns that REQUEST credentials (not warnings about them). */
const CREDENTIAL_REQUEST_PATTERNS = [
  // Matches "share/send/provide your PIN" but NOT "do not share your PIN" or "never share"
  /(?<!\bnot\s)(?<!\bnever\s)(?<!\bdon't\s)(?<!\bdo\snot\s)\b(share|send|provide|enter|give|tell)\b.{0,30}\b(pin|otp|password|card\s*number|cvv|secret)\b/i,
  /\b(pin|otp|password|card\s*number|cvv)\b.{0,30}(?<!\bnot\s)(?<!\bnever\s)\b(share|send|provide|enter|give|tell)\b/i,
];

/** Patterns that make unauthorized action promises. */
const UNAUTHORIZED_ACTION_PATTERNS = [
  /\b(we will|we have|we've|you will be|your account will be|has been)\s+(refund|reverse|unblock|credit|debit)/i,
  /\b(refund|reversal|credit)\s+(has been|will be|is being)\s+(processed|initiated|completed|done)/i,
  /\byou will be refunded\b/i,
];

/** Check for third-party redirection (unofficial channels). */
const THIRD_PARTY_PATTERNS = [
  /\b(contact|call|visit|go to)\b.{0,40}\b(facebook|whatsapp|telegram|twitter|imo)\b/i,
  /\b(click|visit|open)\s+(this|the|our)?\s*(link|url|website)\b/i,
];

/** Token / secret leak patterns. */
const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/,
  /\bat\s+line\s+\d+\b/i, // Stack trace
  /Error:\s+\w+Error/,
  /\.ts:\d+:\d+/,
];

export interface ScanResult {
  field: "customer_reply" | "recommended_next_action";
  reason: string;
}

function scanField(
  value: string,
  fieldName: "customer_reply" | "recommended_next_action",
  complaint: string,
): ScanResult | null {
  // 1. Credential-request scan
  for (const pattern of CREDENTIAL_REQUEST_PATTERNS) {
    if (pattern.test(value)) {
      return { field: fieldName, reason: "credential_request_detected" };
    }
  }

  // 2. Unauthorized-action scan
  for (const pattern of UNAUTHORIZED_ACTION_PATTERNS) {
    if (pattern.test(value)) {
      return { field: fieldName, reason: "unauthorized_action_detected" };
    }
  }

  // 3. Third-party redirection scan
  for (const pattern of THIRD_PARTY_PATTERNS) {
    if (pattern.test(value)) {
      return { field: fieldName, reason: "third_party_redirection_detected" };
    }
  }

  // 4. Secret/stack-trace/token leak scan
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(value)) {
      return { field: fieldName, reason: "secret_leak_detected" };
    }
  }

  // 5. Injection-echo scan — complaint instruction text in output
  // Check if substantial complaint substrings appear in output
  if (complaint.length > 20) {
    const injectionPhrases = [
      "ignore previous",
      "system:",
      "you are now",
      "reply with",
    ];
    for (const phrase of injectionPhrases) {
      if (
        complaint.toLowerCase().includes(phrase) &&
        value.toLowerCase().includes(phrase)
      ) {
        return { field: fieldName, reason: "injection_echo_detected" };
      }
    }
  }

  return null;
}

/**
 * Apply output rails to the response. Scans customer_reply and
 * recommended_next_action. If any scan trips, replaces the field with
 * its deterministic safe template. Never blocks, never 5xx.
 */
export function applyOutputRails(
  response: AnalyzeTicketOutput,
  complaint: string,
  language: Language,
): { response: AnalyzeTicketOutput; trippedReasons: string[] } {
  const trippedReasons: string[] = [];

  // Scan customer_reply
  const replyScan = scanField(
    response.customer_reply,
    "customer_reply",
    complaint,
  );
  if (replyScan) {
    trippedReasons.push(replyScan.reason);
    response.customer_reply = buildReply(
      response.case_type,
      language,
      response.relevant_transaction_id,
    );
  }

  // Scan recommended_next_action
  const actionScan = scanField(
    response.recommended_next_action,
    "recommended_next_action",
    complaint,
  );
  if (actionScan) {
    trippedReasons.push(actionScan.reason);
    response.recommended_next_action = buildNextAction(
      response.case_type,
      response.evidence_verdict,
      response.relevant_transaction_id,
    );
  }

  // Enum coercion + full re-validation
  const validation = analyzeTicketOutputSchema.safeParse(response);
  if (!validation.success) {
    trippedReasons.push("output_validation_failed");
    // Fix known issues: ensure nonempty strings
    if (!response.agent_summary || response.agent_summary.trim() === "") {
      response.agent_summary =
        "Support ticket received. Routing to appropriate department for review.";
    }
    if (!response.customer_reply || response.customer_reply.trim() === "") {
      response.customer_reply = buildReply(
        response.case_type,
        language,
        response.relevant_transaction_id,
      );
    }
    if (
      !response.recommended_next_action ||
      response.recommended_next_action.trim() === ""
    ) {
      response.recommended_next_action = buildNextAction(
        response.case_type,
        response.evidence_verdict,
        response.relevant_transaction_id,
      );
    }
  }

  return { response, trippedReasons };
}
