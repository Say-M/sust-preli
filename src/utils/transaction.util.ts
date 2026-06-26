import {
  CaseType,
  EvidenceVerdict,
  Transaction,
  TransactionStatus,
} from "../modules/analyze-ticket/analyze-ticket.schema";
import { extractAmounts, extractPhoneNumbers } from "./text.util";

/** Window in ms to consider two transactions "close in time" for duplicate detection. */
export const DUPLICATE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export interface MatchResult {
  txn: Transaction | null;
  verdict: EvidenceVerdict;
  caseTypeOverride?: CaseType;
}

/**
 * Match complaint to a transaction in history. Deterministic — no LLM.
 *
 * Rules:
 * - 0 candidates → null, insufficient_data
 * - 1 candidate → that txn, consistent (unless contradiction fires)
 * - >1 with no disambiguator → null, insufficient_data (never guess)
 * - Duplicate rule: ≥2 completed payments, same amount+counterparty, close in time
 * - Contradiction rule: named recipient has ≥3 prior transfers → inconsistent
 */
export function matchTransaction(
  complaint: string,
  history: Transaction[] | undefined,
  caseType: CaseType,
): MatchResult {
  if (!history || history.length === 0) {
    return { txn: null, verdict: EvidenceVerdict.insufficient_data };
  }

  // Check for duplicate payment pattern FIRST
  const duplicateResult = checkDuplicatePayment(history);
  if (duplicateResult) {
    return duplicateResult;
  }

  const amounts = extractAmounts(complaint);
  const phones = extractPhoneNumbers(complaint);

  // If no amounts extracted, can't match
  if (amounts.length === 0) {
    return { txn: null, verdict: EvidenceVerdict.insufficient_data };
  }

  // Find candidates matching extracted amounts
  let candidates = history.filter((txn) =>
    amounts.some((a) => Math.abs(txn.amount - a) < 0.01),
  );

  if (candidates.length === 0) {
    return { txn: null, verdict: EvidenceVerdict.insufficient_data };
  }

  // Narrow by phone number if mentioned in complaint
  if (phones.length > 0 && candidates.length > 1) {
    const phoneFiltered = candidates.filter((txn) =>
      phones.some((p) => txn.counterparty.includes(p)),
    );
    if (phoneFiltered.length > 0) {
      candidates = phoneFiltered;
    }
  }

  if (candidates.length === 0) {
    return { txn: null, verdict: EvidenceVerdict.insufficient_data };
  }

  if (candidates.length === 1) {
    const txn = candidates[0]!;
    // Contradiction rule: wrong_transfer + named recipient has ≥3 prior transfers
    if (caseType === CaseType.wrong_transfer) {
      const priorToSame = history.filter(
        (t) =>
          t.counterparty === txn.counterparty &&
          t.transaction_id !== txn.transaction_id,
      );
      if (priorToSame.length >= 3) {
        return { txn, verdict: EvidenceVerdict.inconsistent };
      }
    }
    return { txn, verdict: EvidenceVerdict.consistent };
  }

  // >1 candidate: try to disambiguate
  // If all same counterparty and close in time, could be duplicate
  // Otherwise, insufficient_data (never guess)
  return { txn: null, verdict: EvidenceVerdict.insufficient_data };
}

/**
 * Check for duplicate payment pattern:
 * ≥2 completed payments, same amount + counterparty, close in time.
 * Returns the LATER transaction as relevant_id, verdict: consistent.
 */
function checkDuplicatePayment(history: Transaction[]): MatchResult | null {
  const completed = history.filter(
    (t) =>
      t.status === TransactionStatus.completed &&
      (t.type === "payment" || t.type === "transfer"),
  );

  // Group by amount + counterparty
  const groups = new Map<string, Transaction[]>();
  for (const txn of completed) {
    const key = `${txn.amount}|${txn.counterparty}`;
    const group = groups.get(key) ?? [];
    group.push(txn);
    groups.set(key, group);
  }

  for (const group of Array.from(groups.values())) {
    if (group.length >= 2) {
      // Sort by timestamp ascending
      const sorted = group.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

      // Check if any two are close in time
      for (let i = 1; i < sorted.length; i++) {
        const diff =
          new Date(sorted[i]!.timestamp).getTime() -
          new Date(sorted[i - 1]!.timestamp).getTime();
        if (diff <= DUPLICATE_WINDOW_MS) {
          // Return the LATER one as the relevant transaction
          return {
            txn: sorted[i]!,
            verdict: EvidenceVerdict.consistent,
            caseTypeOverride: CaseType.duplicate_payment,
          };
        }
      }
    }
  }

  return null;
}
