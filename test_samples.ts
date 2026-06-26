import fs from "fs";
import { analyzeTicket } from "./src/agents/investigator";
import type { AnalyzeTicketInput } from "./src/modules/analyze-ticket/analyze-ticket.schema";

async function runTests() {
  const parsed = JSON.parse(fs.readFileSync("SUST_Preli_Sample_Cases.json", "utf-8"));
  const cases = parsed.cases;
  
  let passed = 0;
  let failed = 0;

  for (const sample of cases) {
    console.log(`\nRunning ${sample.id}...`);
    try {
      const input: AnalyzeTicketInput = sample.input;

      const result = await analyzeTicket(input);

      let isMatch = true;
      const expected = sample.expected_output;

      const checks = [
        "relevant_transaction_id",
        "evidence_verdict",
        "case_type",
        "department",
        "human_review_required"
      ];

      for (const field of checks) {
        if (result[field as keyof typeof result] !== expected[field]) {
          console.error(`Mismatch on ${field}: Expected ${expected[field]}, Got ${result[field as keyof typeof result]}`);
          isMatch = false;
        }
      }

      // Check severity (approximate is okay but check it)
      if (result.severity !== expected.severity) {
        console.log(`  Severity warning: Expected ${expected.severity}, Got ${result.severity}`);
      }

      if (isMatch) {
        console.log(`  ✅ Passed`);
        passed++;
      } else {
        console.log(`  ❌ Failed`);
        failed++;
      }

      // Special check for S07 (Bangla reply)
      if (sample.id === "SAMPLE-07") {
        const reply = result.customer_reply;
        if (reply.includes("[HUMAN_REVIEW_REQUIRED]")) {
          console.error(`  ❌ SAMPLE-07 reply contains [HUMAN_REVIEW_REQUIRED]!`);
        } else if (!reply.includes("না")) {
          console.error(`  ❌ SAMPLE-07 reply is missing negation 'না'!`);
        } else {
          console.log(`  ✅ SAMPLE-07 Bangla check passed`);
        }
      }

    } catch (e) {
      console.error(`Error running ${sample.id}:`, e);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
}

runTests();
