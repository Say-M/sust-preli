import {
  CaseType,
  Department,
  EvidenceVerdict,
  Language,
  Severity,
} from "../modules/analyze-ticket/analyze-ticket.schema";


export interface RouteInfo {
  department: Department;
  baseSeverity: Severity;
  escalate: boolean;
}

const ROUTING_TABLE: Record<CaseType, RouteInfo> = {
  [CaseType.wrong_transfer]: {
    department: Department.dispute_resolution,
    baseSeverity: Severity.high,
    escalate: true,
  },
  [CaseType.payment_failed]: {
    department: Department.payments_ops,
    baseSeverity: Severity.high,
    escalate: false,
  },
  [CaseType.refund_request]: {
    department: Department.customer_support,
    baseSeverity: Severity.low,
    escalate: false,
  },
  [CaseType.duplicate_payment]: {
    department: Department.payments_ops,
    baseSeverity: Severity.high,
    escalate: true,
  },
  [CaseType.merchant_settlement_delay]: {
    department: Department.merchant_operations,
    baseSeverity: Severity.medium,
    escalate: false,
  },
  [CaseType.agent_cash_in_issue]: {
    department: Department.agent_operations,
    baseSeverity: Severity.high,
    escalate: true,
  },
  [CaseType.phishing_or_social_engineering]: {
    department: Department.fraud_risk,
    baseSeverity: Severity.critical,
    escalate: true,
  },
  [CaseType.other]: {
    department: Department.customer_support,
    baseSeverity: Severity.low,
    escalate: false,
  },
};

export function route(caseType: CaseType): RouteInfo {
  return ROUTING_TABLE[caseType] ?? ROUTING_TABLE[CaseType.other];
}

export function needsHumanReview(
  caseType: CaseType,
  verdict: EvidenceVerdict,
  relevantTxnId: string | null,
): boolean {
  if (caseType === CaseType.phishing_or_social_engineering) return true;
  if (relevantTxnId === null || verdict === EvidenceVerdict.insufficient_data) {
    return false;
  }
  if (verdict === EvidenceVerdict.inconsistent) return true;
  return ROUTING_TABLE[caseType].escalate;
}

// ─────────────────────────────────────────────────────────────────────────────
// Templated customer_reply — buildReply(caseType, language, txnId)
// ─────────────────────────────────────────────────────────────────────────────

const REPLY_TEMPLATES_EN: Record<CaseType, string> = {
  [CaseType.wrong_transfer]:
    "We have received your complaint regarding a wrong transfer{txnRef}. Our dispute resolution team is reviewing the details, and any eligible amount will be returned through official channels. Please do not share your PIN or OTP.",
  [CaseType.payment_failed]:
    "We have received your complaint about a failed payment{txnRef}. Our payments team is investigating, and any eligible amount will be returned through official channels. Please do not share your PIN or OTP.",
  [CaseType.refund_request]:
    "We have received your refund request{txnRef}. Our team is reviewing the transaction, and any eligible amount will be returned through official channels. Please do not share your PIN or OTP.",
  [CaseType.duplicate_payment]:
    "We have received your complaint about a possible duplicate payment{txnRef}. Our payments team is investigating, and any eligible amount will be returned through official channels. Please do not share your PIN or OTP.",
  [CaseType.merchant_settlement_delay]:
    "We have received your complaint regarding a merchant settlement delay{txnRef}. Our merchant operations team is looking into this. Please do not share your PIN or OTP.",
  [CaseType.agent_cash_in_issue]:
    "We have received your complaint about an agent cash-in issue{txnRef}. Our agent operations team is reviewing the matter, and any eligible amount will be returned through official channels. Please do not share your PIN or OTP.",
  [CaseType.phishing_or_social_engineering]:
    "We have received your report about a potential fraud incident{txnRef}. Our fraud and risk team is investigating. Please do not share your PIN or OTP.",
  [CaseType.other]:
    "We have received your inquiry{txnRef}. Our customer support team will review your concern and get back to you. Please do not share your PIN or OTP.",
};

// Only the wrong_transfer Bangla template is publicly known. Others are placeholders.
const REPLY_TEMPLATES_BN: Record<CaseType, string> = {
  [CaseType.wrong_transfer]:
    "আমরা আপনার ভুল ট্রান্সফার সংক্রান্ত অভিযোগ পেয়েছি{txnRef}। আমাদের বিরোধ নিষ্পত্তি দল লেনদেনের বিবরণ পর্যালোচনা করছে। যোগ্য হলে, যেকোনো পরিমাণ অফিসিয়াল চ্যানেলের মাধ্যমে ফেরত দেওয়া হবে। অনুগ্রহ করে আপনার পিন, ওটিপি বা পাসওয়ার্ড কারও সাথে শেয়ার করবেন না। আপডেটের জন্য, অফিসিয়াল সাপোর্ট চ্যানেলের মাধ্যমে যোগাযোগ করুন।",
  [CaseType.payment_failed]:
    "আমরা আপনার ব্যর্থ পেমেন্ট সংক্রান্ত অভিযোগ পেয়েছি{txnRef}। আমাদের পেমেন্ট দল বিষয়টি তদন্ত করছে। আপনার ব্যালেন্স কাটা হয়ে থাকলে, যোগ্য পরিমাণ অফিসিয়াল চ্যানেলের মাধ্যমে ফেরত দেওয়া হবে। অনুগ্রহ করে আপনার পিন, ওটিপি বা পাসওয়ার্ড কারও সাথে শেয়ার করবেন না।",
  [CaseType.refund_request]:
    "আমরা আপনার ফেরত অনুরোধ পেয়েছি{txnRef}। আমাদের দল লেনদেনটি পর্যালোচনা করছে। যোগ্য হলে, পরিমাণ অফিসিয়াল চ্যানেলের মাধ্যমে প্রক্রিয়া করা হবে। অনুগ্রহ করে আপনার পিন, ওটিপি বা পাসওয়ার্ড কারও সাথে শেয়ার করবেন না।",
  [CaseType.duplicate_payment]:
    "আমরা আপনার সম্ভাব্য ডুপ্লিকেট পেমেন্ট সংক্রান্ত অভিযোগ পেয়েছি{txnRef}। আমাদের পেমেন্ট দল তদন্ত করছে। ডুপ্লিকেট চার্জ নিশ্চিত হলে, যোগ্য পরিমাণ অফিসিয়াল চ্যানেলের মাধ্যমে ফেরত দেওয়া হবে। অনুগ্রহ করে আপনার পিন, ওটিপি বা পাসওয়ার্ড কারও সাথে শেয়ার করবেন না।",
  [CaseType.merchant_settlement_delay]:
    "আমরা মার্চেন্ট সেটেলমেন্ট বিলম্ব সংক্রান্ত আপনার অভিযোগ পেয়েছি{txnRef}। আমাদের মার্চেন্ট অপারেশন দল বিষয়টি দেখছে। অনুগ্রহ করে আপনার পিন, ওটিপি বা পাসওয়ার্ড কারও সাথে শেয়ার করবেন না।",
  [CaseType.agent_cash_in_issue]:
    "আমরা এজেন্ট ক্যাশ-ইন সমস্যা সংক্রান্ত আপনার অভিযোগ পেয়েছি{txnRef}। আমাদের এজেন্ট অপারেশন দল বিষয়টি পর্যালোচনা করছে। যোগ্য হলে, পরিমাণ অফিসিয়াল চ্যানেলের মাধ্যমে ফেরত দেওয়া হবে। অনুগ্রহ করে আপনার পিন, ওটিপি বা পাসওয়ার্ড কারও সাথে শেয়ার করবেন না।",
  [CaseType.phishing_or_social_engineering]:
    "আমরা সম্ভাব্য প্রতারণা বা ফিশিং ঘটনার রিপোর্ট পেয়েছি{txnRef}। আপনার অ্যাকাউন্টের নিরাপত্তা আমাদের অগ্রাধিকার। আমাদের ফ্রড ও রিস্ক দল তদন্ত করছে। অনুগ্রহ করে আপনার পিন, ওটিপি বা পাসওয়ার্ড কারও সাথে শেয়ার করবেন না।",
  [CaseType.other]:
    "আমরা আপনার জিজ্ঞাসা পেয়েছি{txnRef}। আমাদের কাস্টমার সাপোর্ট দল আপনার বিষয়টি পর্যালোচনা করবে। অনুগ্রহ করে আপনার পিন, ওটিপি বা পাসওয়ার্ড কারও সাথে শেয়ার করবেন না।",
};

/**
 * Build templated customer reply. Never LLM-generated.
 * Safe by construction: never asks for PIN/OTP/password/card,
 * never promises refund/reversal/unblock.
 */
export function buildReply(
  caseType: CaseType,
  language: Language,
  txnId: string | null,
): string {
  const txnRef = txnId ? ` (Ref: ${txnId})` : "";
  const templates =
    language === Language.bn ? REPLY_TEMPLATES_BN : REPLY_TEMPLATES_EN;
  const template = templates[caseType] ?? templates[CaseType.other];
  return template.replace("{txnRef}", txnRef);
}

const NEXT_ACTION_TEMPLATES: Record<CaseType, string> = {
  [CaseType.wrong_transfer]:
    "Investigate{txnRef} ledger status; verify recipient wallet and initiate dispute resolution workflow.",
  [CaseType.payment_failed]:
    "Investigate{txnRef} ledger status; if balance was deducted on a failed payment, initiate the reversal flow within SLA.",
  [CaseType.refund_request]:
    "Review{txnRef} transaction details and merchant refund policy; process eligible refund through standard workflow.",
  [CaseType.duplicate_payment]:
    "Verify{txnRef} ledger for duplicate entries; if confirmed, initiate reversal for the duplicate transaction within SLA.",
  [CaseType.merchant_settlement_delay]:
    "Check{txnRef} settlement queue and merchant account status; escalate to settlement operations if beyond SLA.",
  [CaseType.agent_cash_in_issue]:
    "Verify{txnRef} agent float balance and cash-in records; reconcile discrepancy and update agent ledger.",
  [CaseType.phishing_or_social_engineering]:
    "Flag account for security review{txnRef}; check for unauthorized transactions and initiate fraud investigation protocol.",
  [CaseType.other]:
    "Review customer inquiry{txnRef} and route to appropriate department for resolution.",
};

/**
 * Build rule-derived next action. NOT LLM-generated.
 */
export function buildNextAction(
  caseType: CaseType,
  _verdict: EvidenceVerdict,
  txnId: string | null,
): string {
  const txnRef = txnId ? ` ${txnId}` : "";
  const template =
    NEXT_ACTION_TEMPLATES[caseType] ?? NEXT_ACTION_TEMPLATES[CaseType.other];
  return template.replace("{txnRef}", txnRef);
}
