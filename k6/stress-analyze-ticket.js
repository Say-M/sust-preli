import http from "k6/http";
import { check } from "k6";
import { BASE_URL, JSON_HEADERS } from "./lib/config.js";
import { pickTicketInput } from "./lib/payloads.js";

export const options = {
  stages: [
    { duration: "1m", target: 20 },
    { duration: "2m", target: 50 },
    { duration: "2m", target: 100 },
    { duration: "1m", target: 150 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<2000"],
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
  });
}
