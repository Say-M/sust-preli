import { Language } from "../modules/analyze-ticket/analyze-ticket.schema";

const INJECTION_MARKERS = [
  "ignore previous",
  "ignore above",
  "disregard",
  "system:",
  "you are now",
  "reply with",
  "act as",
  "pretend you",
  "new instructions",
  "override",
];

/**
 * Detects prompt-injection markers in untrusted complaint text.
 * Returns true if any marker is found. Behavior never changes based on result;
 * only adds a reason_code.
 */
export function detectInjection(complaint: string): boolean {
  const lower = complaint.toLowerCase();
  return INJECTION_MARKERS.some((marker) => lower.includes(marker));
}

/**
 * Detect language from complaint text and optional input language hint.
 * Uses Bangla Unicode range detection.
 */
export function detectLanguage(
  complaint: string,
  inputLanguage?: Language,
): Language {
  if (inputLanguage && inputLanguage !== Language.mixed) {
    return inputLanguage;
  }

  // Bangla Unicode block: \u0980-\u09FF
  const hasBangla = /[\u0980-\u09FF]/.test(complaint);
  const hasLatin = /[a-zA-Z]/.test(complaint);

  if (hasBangla && hasLatin) return Language.mixed;
  if (hasBangla) return Language.bn;
  return Language.en;
}

/** Map Bangla digits ০-৯ to 0-9. */
export function banglaToEnglishDigits(str: string): string {
  return str.replace(/[০-৯]/g, (ch) => {
    return String(ch.charCodeAt(0) - 0x09e6);
  });
}

/**
 * Extract monetary amounts from text.
 * Handles English + Bangla digits (০-৯), taka/টাকা markers.
 * Filters noise like "2pm", phone numbers.
 */
export function extractAmounts(text: string): number[] {
  const normalized = banglaToEnglishDigits(text);
  const amounts: number[] = [];

  // Match numbers potentially followed by taka/টাকা, or preceded by taka/tk/BDT
  const patterns = [
    // "5000 taka", "৫০০০ টাকা", "5,000 taka"
    /(?:[\d,]+(?:\.\d{1,2})?)\s*(?:taka|টাকা|tk|bdt)/gi,
    // "taka 5000", "BDT 5000"
    /(?:taka|টাকা|tk|bdt)\s*(?:[\d,]+(?:\.\d{1,2})?)/gi,
    // Standalone numbers (will be filtered below)
    /\b(\d{2,}(?:,\d{3})*(?:\.\d{1,2})?)\b/g,
  ];

  const seen = new Set<number>();

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(normalized)) !== null) {
      const numStr = match[0].replace(/[^0-9.]/g, "");
      const num = parseFloat(numStr);
      if (!isNaN(num) && num > 0 && !seen.has(num)) {
        // Filter out noise: phone numbers (11+ digits), times like "2pm",
        const digitCount = numStr.replace(/\./g, "").length;
        if (digitCount <= 10 && num >= 10) {
          // Check if this number is followed by pm/am (time), or looks like a year
          const afterMatch = normalized.substring(
            (match.index ?? 0) + match[0].length,
            (match.index ?? 0) + match[0].length + 5,
          );
          if (/^\s*(pm|am|:|o'clock)/i.test(afterMatch)) continue;

          seen.add(num);
          amounts.push(num);
        }
      }
    }
  }

  return amounts;
}

/**
 * Extract Bangladeshi phone numbers (11-digit, starting with 01).
 */
export function extractPhoneNumbers(text: string): string[] {
  const normalized = banglaToEnglishDigits(text);
  const matches = normalized.match(/\b01[3-9]\d{8}\b/g);
  return matches ?? [];
}
