import { z } from "zod";

export enum Language {
  en = "en",
  bn = "bn",
  mixed = "mixed",
}

export enum Channel {
  in_app_chat = "in_app_chat",
  call_center = "call_center",
  email = "email",
  merchant_portal = "merchant_portal",
  field_agent = "field_agent",
}

export enum UserType {
  customer = "customer",
  merchant = "merchant",
  agent = "agent",
  unknown = "unknown",
}

export const userTypeSchema = z.enum([
  "customer",
  "merchant",
  "agent",
  "unknown",
]);

export enum TransactionType {
  transfer = "transfer",
  payment = "payment",
  cash_in = "cash_in",
  cash_out = "cash_out",
  settlement = "settlement",
  refund = "refund",
}

export enum TransactionStatus {
  completed = "completed",
  failed = "failed",
  pending = "pending",
  reversed = "reversed",
}

export enum EvidenceVerdict {
  consistent = "consistent",
  inconsistent = "inconsistent",
  insufficient_data = "insufficient_data",
}

export enum CaseType {
  wrong_transfer = "wrong_transfer",
  payment_failed = "payment_failed",
  refund_request = "refund_request",
  duplicate_payment = "duplicate_payment",
  merchant_settlement_delay = "merchant_settlement_delay",
  agent_cash_in_issue = "agent_cash_in_issue",
  phishing_or_social_engineering = "phishing_or_social_engineering",
  other = "other",
}

export enum Severity {
  low = "low",
  medium = "medium",
  high = "high",
  critical = "critical",
}

export enum Department {
  customer_support = "customer_support",
  dispute_resolution = "dispute_resolution",
  payments_ops = "payments_ops",
  merchant_operations = "merchant_operations",
  agent_operations = "agent_operations",
  fraud_risk = "fraud_risk",
}

export const transactionSchema = z.object({
  transaction_id: z.string(),
  timestamp: z.iso.datetime(),
  type: z.enum(TransactionType),
  amount: z.number().positive(),
  counterparty: z.string(),
  status: z.enum(TransactionStatus),
});

export const analyzeTicketInputSchema = z.object({
  ticket_id: z.string().nonempty(),
  complaint: z.string().nonempty(),
  language: z.enum(Language).optional(),
  channel: z.enum(Channel).optional(),
  user_type: z.enum(UserType).optional(),
  campaign_context: z.string().optional(),
  transaction_history: z.array(transactionSchema).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const analyzeTicketOutputSchema = z.object({
  ticket_id: z.string().nonempty(),
  relevant_transaction_id: z.string().nullable(),
  evidence_verdict: z.enum(EvidenceVerdict),
  case_type: z.enum(CaseType),
  severity: z.enum(Severity),
  department: z.enum(Department),
  agent_summary: z.string().nonempty(),
  recommended_next_action: z.string().nonempty(),
  customer_reply: z.string().nonempty(),
  human_review_required: z.boolean(),
  confidence: z.number().min(0).max(1).nullish(),
  reason_codes: z.array(z.string()).nullish(),
});

export type Transaction = z.infer<typeof transactionSchema>;
export type AnalyzeTicketInput = z.infer<typeof analyzeTicketInputSchema>;
export type AnalyzeTicketOutput = z.infer<typeof analyzeTicketOutputSchema>;
