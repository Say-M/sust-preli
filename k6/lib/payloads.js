import { SharedArray } from "k6/data";

const samplePath =
  __ENV.SAMPLE_CASES_PATH || "../../SUST_Preli_Sample_Cases.json";

export const ticketInputs = new SharedArray("ticketInputs", () => {
  const raw = JSON.parse(open(samplePath));
  return raw.cases.map((c) => c.input);
});

export function pickTicketInput() {
  return ticketInputs[(__VU + __ITER) % ticketInputs.length];
}
