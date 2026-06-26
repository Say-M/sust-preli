# Support Ticket Analysis API

A deterministic-first support ticket triage API for digital-finance platforms (bKash-like). **Rules decide; the LLM only refines `case_type` and drafts `agent_summary`.** No §8-scored field is LLM-generated. The service returns a valid 200 even with the LLM disabled or failing.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | [Bun](https://bun.sh/) 1.3+ |
| Framework | [Hono](https://hono.dev/) 4.x |
| Language | TypeScript (strict mode) |
| Validation | [Zod](https://zod.dev/) 4.x (v4-only syntax: `z.enum(NativeEnum)`, `z.iso.datetime()`) |
| LLM | [OpenAI SDK](https://github.com/openai/openai-node) 6.x — single structured-output call |
| Containerization | Docker + docker-compose |

## Setup & Run

### Prerequisites
- [Bun](https://bun.sh/) ≥ 1.3
- An OpenAI API key (only needed if `USE_LLM=true`)

### Install dependencies
```sh
bun install
```

### Configure environment
```sh
cp .env.example .env
# Edit .env with your OpenAI API key
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `OPENAI_API_KEY` | — | OpenAI API key (required if `USE_LLM=true`) |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model for the classification call |
| `USE_LLM` | `true` | Set `false` to disable LLM and use keyword fallback only |
| `PORT` | `3000` | Server port |
| `SERVER_URL` | `http://localhost:3000` | Base URL for OpenAPI docs |

### Run (development)
```sh
bun run dev
```

### Run (production)
```sh
bun run start
```

### Run (Docker)
```sh
docker compose up --build
```

### Endpoints
- `POST /analyze-ticket` — Analyze a support ticket
- `GET /health` — Health check → `{"status":"ok"}`
- `GET /docs` — Interactive API documentation (Scalar)
- `GET /openapi` — OpenAPI spec (JSON)

---

## Architecture: Rules Decide

```
analyze-ticket.route.ts  →  analyze-ticket.service.ts  →  agents/investigator.ts
       (validation)              (thin seam)                  (THE agent)
```

### What the rules engine determines (deterministic, no LLM):
- `relevant_transaction_id` — matched from complaint text + transaction history
- `evidence_verdict` — `consistent` / `inconsistent` / `insufficient_data`
- `severity` — from routing table lookup
- `department` — from routing table lookup
- `human_review_required` — escalate flag OR inconsistent OR high-value
- `customer_reply` — **templated** per case_type + language
- `recommended_next_action` — **templated** per case_type

### What the LLM provides (optional, one call, structured output):
- `case_type` — enum-locked via JSON schema `strict: true` (invalid enum impossible)
- `agent_summary` — 1-2 factual sentences for the support agent

### LLM Fallback
On ANY LLM error, timeout (10s hard ceiling), or when `USE_LLM=false`:
- `case_type` → keyword-based classifier
- `agent_summary` → generic safe template
- **The service never crashes or hangs.**

---

## Guardrail Taxonomy

### Input Rails
1. **Injection neutralization**: Complaint is UNTRUSTED DATA. Passed as fenced user content (never in system prompt). Markers detected: "ignore previous", "system:", "you are now", "reply with", etc. Adds `reason_code: "possible_injection"` — behavior never changes.
2. **Topical rail**: Off-topic / nonsense → `case_type: other`, `evidence_verdict: insufficient_data`, `department: customer_support`. No "I can't help" path — always returns the schema.

### Output Rails (applied before every response)
1. **Credential-request scan**: Blocks requests to share/send/provide/enter PIN|OTP|password|card. _Warnings_ like "do not share your OTP" are allowed.
2. **Unauthorized-action scan**: Blocks promises like "we will refund/reverse/unblock".
3. **Third-party redirection scan**: Only official channels allowed.
4. **Secret/stack-trace/token leak scan**: Blocks `sk-` tokens, stack traces, file paths.
5. **Injection-echo scan**: Prevents complaint instruction text from appearing in output.
6. **Schema re-validation**: Full Zod re-validation with safe defaults on failure.

If any scan trips → the field is replaced with its deterministic safe template. **Never blocks, never 5xx from a guardrail.**

### Why No OpenAI Moderation API Call
- Customer replies are **templated** (safe by construction), not LLM-generated
- A synchronous moderation call would add latency (~200-500ms) and a new failure mode
- No scored benefit since the templated replies are pre-vetted
- If needed in the future, a **local zero-network word-list pass** that only sets a `reason_code` is the recommended approach (no latency cost, no external dependency)

---

## Model Choice & Cost Reasoning

**Model**: `gpt-4o-mini` (configurable via `OPENAI_MODEL`)

- **Task**: Enum classification (1 of 8 values) + 1-2 sentence summary
- **Why mini**: This is a simple classification task — a small/fast model is sufficient and far cheaper
- **Structured outputs**: `strict: true` JSON schema makes invalid enum values impossible at the API level
- **Cost**: ~$0.15 per 1M input tokens / ~$0.60 per 1M output tokens — negligible per request
- **Latency**: p50 < 1s, well within the 5s p95 target

---

## Assumptions

| Assumption | Value | Notes |
|---|---|---|
| `HIGH_VALUE_BDT` | 10,000 BDT | Tunable threshold for human review escalation. **This is a GUESS** based on typical digital wallet transaction ranges. |
| Duplicate window | 5 minutes | Two transactions with same amount + counterparty within this window → `duplicate_payment` |
| Amount extraction | ≥ 10 BDT | Amounts below 10 are filtered as noise |
| Phone number format | `01X-XXXXXXXX` | 11-digit BD mobile numbers starting with 01 |

---

## Known Limitations

1. **Bangla template coverage**: Only 1 of 8 Bangla `customer_reply` templates (`wrong_transfer`) is publicly verified. The other 7 are best-effort translations marked `[HUMAN_REVIEW_REQUIRED]` in the source. **A human Bangla speaker must review these before production use.**
2. **Keyword classifier**: The fallback keyword classifier is intentionally simple. It may mis-classify edge cases that the LLM handles well (e.g., Bangla-only complaints with no obvious keywords).
3. **Transaction matching**: Amount-based matching may miss transactions if the customer uses approximate amounts ("around 5000") or non-standard formatting.
4. **Duplicate detection**: Only considers same amount + same counterparty + close timestamps. Does not detect semantic duplicates (e.g., "I paid twice" without matching transaction metadata).
5. **No persistent state**: Each request is independent — no cross-request correlation or ticket history.

---

## Project Structure

```
src/
  common/schema.ts                         # errorResponseSchema only
  modules/
    analyze-ticket/
      analyze-ticket.schema.ts             # SINGLE source of truth: all enums + Zod schemas + types
      analyze-ticket.route.ts              # Hono POST handler: JSON parse, validate, call service, error mapping
      analyze-ticket.service.ts            # THIN seam: returns investigator.analyzeTicket(validatedInput)
    health/
      health.route.ts                      # GET /health → {"status":"ok"}
      health.schema.ts
      health.service.ts
  agents/
    investigator.ts                        # THE agent. Exported analyzeTicket(input). All reasoning + rails.
  index.ts                                 # Mount routers, bind 0.0.0.0, PORT from env
```
