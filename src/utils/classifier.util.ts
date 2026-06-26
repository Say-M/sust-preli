import { CaseType } from "../modules/analyze-ticket/analyze-ticket.schema";

const KEYWORD_RULES: Array<{ keywords: string[]; caseType: CaseType }> = [
  {
    keywords: [
      "phishing",
      "fraud",
      "scam",
      "otp shared",
      "otp দিয়ে",
      "প্রতারণা",
      "social engineering",
    ],
    caseType: CaseType.phishing_or_social_engineering,
  },
  {
    keywords: [
      "duplicate",
      "twice",
      "double",
      "two times",
      "দুইবার",
      "ডাবল",
      "2 bar",
    ],
    caseType: CaseType.duplicate_payment,
  },
  {
    keywords: [
      "wrong",
      "ভুল",
      "mistakenly",
      "wrong number",
      "wrong person",
      "ভুল নম্বর",
      "galti",
    ],
    caseType: CaseType.wrong_transfer,
  },
  {
    keywords: [
      "fail",
      "failed",
      "ব্যর্থ",
      "error",
      "not completed",
      "didn't go through",
      "unsuccessful",
      "deducted but",
    ],
    caseType: CaseType.payment_failed,
  },
  {
    keywords: ["refund", "ফেরত", "return money", "money back", "cashback"],
    caseType: CaseType.refund_request,
  },
  {
    keywords: [
      "settlement",
      "মার্চেন্ট",
      "merchant",
      "সেটেলমেন্ট",
      "not received in merchant",
    ],
    caseType: CaseType.merchant_settlement_delay,
  },
  {
    keywords: [
      "agent",
      "cash in",
      "এজেন্ট",
      "ক্যাশ ইন",
      "cash-in",
      "agent point",
    ],
    caseType: CaseType.agent_cash_in_issue,
  },
];

/**
 * Simple keyword-based classifier. Used as fallback when LLM is disabled or fails.
 */
export function keywordClassify(complaint: string): CaseType {
  const lower = complaint.toLowerCase();
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return rule.caseType;
    }
  }
  return CaseType.other;
}
