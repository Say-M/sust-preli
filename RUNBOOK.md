# Runbook: Bring Up the Service Locally

Step-by-step instructions for someone with no prior context. Copy and paste each block in order.

---

## What you are starting

A HTTP API on port **3000** with these endpoints:

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | Liveness check |
| `/analyze-ticket` | POST | Analyze a support ticket |
| `/docs` | GET | Interactive API docs (browser) |
| `/openapi` | GET | OpenAPI JSON spec |

---

## Prerequisites

Install **one** of the following run methods:

### Option A: Bun (recommended for development)

- [Bun](https://bun.sh/) **1.3 or newer**

Check:

```sh
bun --version
```

### Option B: Docker (recommended for production-like runs)

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes `docker compose`)

Check:

```sh
docker --version
docker compose version
```

### Optional (only if LLM refinement is enabled)

- An [OpenAI API key](https://platform.openai.com/api-keys)
- Set `USE_LLM=false` in `.env` if you do not have a key, the API still works using keyword fallback

---

## Step 1: Get the code

```sh
git clone https://github.com/Say-M/sust-preli
cd sust-2026-preli
```

If you already have the folder, just enter it:

```sh
cd sust-2026-preli
```

---

## Step 2: Create environment file

**macOS / Linux / Git Bash:**

```sh
cp .env.example .env
```

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

Open `.env` in an editor and set values:

```env
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4o-mini
USE_LLM=true
PORT=3000
SERVER_URL=http://localhost:3000
```

Notes:

- `USE_LLM=false`: no OpenAI key required; rules-only mode
- `USE_LLM=true`: `OPENAI_API_KEY` must be set
- Do **not** commit `.env` (it is gitignored)

---

## Step 3: Start the service

Pick **one** path below.

### Path A: Local development (hot reload)

```sh
bun install
bun run dev
```

Leave this terminal open. The server reloads when you edit source files.

### Path B: Local production mode (no hot reload)

```sh
bun install
bun run start
```

### Path C: Docker

```sh
docker compose up --build
```

Run in the background:

```sh
docker compose up --build -d
```

Or use the npm script alias:

```sh
bun run docker:prod:up
```

---

## Step 4: Verify it is running

### 4a. Health check

**macOS / Linux / Git Bash / Windows PowerShell:**

```sh
curl http://localhost:3000/health
```

Expected response:

```json
{"status":"ok"}
```

### 4b. Open API docs in a browser

```
http://localhost:3000/docs
```

### 4c. Smoke-test analyze-ticket

```sh
curl -X POST http://localhost:3000/analyze-ticket \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_id": "TKT-001",
    "complaint": "I sent 5000 taka to a wrong number around 2pm today. Please help me get my money back.",
    "language": "en",
    "channel": "in_app_chat",
    "user_type": "customer",
    "transaction_history": [
      {
        "transaction_id": "TXN-9101",
        "timestamp": "2026-04-14T14:08:22Z",
        "type": "transfer",
        "amount": 5000,
        "counterparty": "+8801719876543",
        "status": "completed"
      }
    ]
  }'
```

Expected: HTTP **200** with JSON containing at least:

- `ticket_id`
- `relevant_transaction_id`
- `evidence_verdict`
- `case_type`
- `severity`
- `department`
- `agent_summary`
- `recommended_next_action`
- `customer_reply`
- `human_review_required`

---

## Step 5: Stop the service

### Bun (dev or start)

Press `Ctrl+C` in the terminal where the server is running.

### Docker (foreground)

Press `Ctrl+C`, then:

```sh
docker compose down
```

### Docker (background)

```sh
docker compose down
```

Or:

```sh
bun run docker:prod:down
```

---

## Troubleshooting

### Port 3000 already in use

Change port in `.env`:

```env
PORT=3001
SERVER_URL=http://localhost:3001
```

Restart the service, then use `http://localhost:3001` in all URLs above.

### `bun: command not found`

Install Bun: https://bun.sh/docs/installation

Then open a **new** terminal and rerun from Step 3 Path A or B.

### Docker build fails on `bun install`

Ensure `bun.lock` exists in the project root and run:

```sh
docker compose build --no-cache
```

### `curl` not found (Windows)

Use PowerShell instead:

```powershell
Invoke-RestMethod http://localhost:3000/health
```

### OpenAI / LLM errors but you only need local testing

Set in `.env`:

```env
USE_LLM=false
```

Restart the service. Responses still return HTTP 200 using deterministic rules.

### Service starts but `/health` fails

1. Confirm the process is listening:

   ```sh
   curl -v http://localhost:3000/health
   ```

2. For Docker, check logs:

   ```sh
   docker compose logs -f api
   ```

3. Confirm `.env` has `PORT=3000` and nothing else is bound to that port.

---

## Quick reference

| Goal | Command |
|---|---|
| Install deps | `bun install` |
| Dev server (hot reload) | `bun run dev` |
| Prod server (local) | `bun run start` |
| Docker up (background) | `bun run docker:prod:up` |
| Docker down | `bun run docker:prod:down` |
| Health check | `curl http://localhost:3000/health` |
| API docs | http://localhost:3000/docs |

---

## Success checklist

- [ ] `bun --version` or `docker compose version` works
- [ ] `.env` exists (copied from `.env.example`)
- [ ] `curl http://localhost:3000/health` returns `{"status":"ok"}`
- [ ] `POST /analyze-ticket` returns HTTP 200 with the required fields
- [ ] http://localhost:3000/docs loads in the browser
