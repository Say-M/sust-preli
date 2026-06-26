import http from "k6/http";
import { check } from "k6";
import { BASE_URL, JSON_HEADERS } from "./lib/config.js";
import { pickTicketInput } from "./lib/payloads.js";

export const options = {
  stages: [
    { duration: "30s", target: 10 },
    { duration: "2m", target: 25 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<800"],
  },
};

export default function () {
  const payload = pickTicketInput();
  const res = http.post(
    `${BASE_URL}/analyze-ticket`,
    JSON.stringify(payload),
    { headers: JSON_HEADERS },
  );

  check(res, {
    "status is 200": (r) => r.status === 200,
    "ticket_id matches": (r) => {
      try {
        return JSON.parse(r.body).ticket_id === payload.ticket_id;
      } catch {
        return false;
      }
    },
    "has case_type": (r) => {
      try {
        return typeof JSON.parse(r.body).case_type === "string";
      } catch {
        return false;
      }
    },
    "has evidence_verdict": (r) => {
      try {
        return typeof JSON.parse(r.body).evidence_verdict === "string";
      } catch {
        return false;
      }
    },
  });
}
