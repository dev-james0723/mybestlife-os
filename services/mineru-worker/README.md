# MinerU worker (My Best Life OS)

Orchestration service for **Doc Oracle**: receives extraction jobs from the Next.js app, downloads the source PDF via signed URL, runs **MinerU** (default: [official Precision Extract API](https://mineru.net/doc/docs/index_en/)), uploads the full MinerU output tree to Supabase Storage, then calls back:

`POST {WORKER_CALLBACK_APP_URL or NEXT_PUBLIC_APP_URL}/api/document-brain/worker/job-status`

Production parsing uses the **official API** so you get full MinerU output (Markdown, JSON, layout, tables, formulas, images). **Local CLI** remains available as `MINERU_ENGINE_PROVIDER=local_cli` for self-hosted experiments.

## Environment

| Variable | Purpose |
|----------|---------|
| `MINERU_ENGINE_PROVIDER` | `official_api` (default) or `local_cli` (legacy in-container `mineru` CLI). |
| `MINERU_OFFICIAL_API_TOKEN` | **Required for `official_api`.** Bearer token from the MinerU console. Never commit or log. |
| `MINERU_OFFICIAL_API_BASE_URL` | API origin (default `https://mineru.net`). |
| `MINERU_MODEL_VERSION` | `pipeline`, `vlm` (default), or `MinerU-HTML` — see [MinerU Precision API docs](https://mineru.net/doc/docs/index_en/). |
| `MINERU_ENABLE_TABLE` | `true` / `false` (default `true`). |
| `MINERU_ENABLE_FORMULA` | `true` / `false` (default `true`). |
| `MINERU_OFFICIAL_API_MAX_WAIT_SEC` | Max seconds to poll task status (default `1800`). |
| `MINERU_OFFICIAL_API_POLL_INTERVAL_SEC` | Seconds between polls (default `2`). |
| `MINERU_WORKER_SECRET` | Must match app `MINERU_WORKER_SECRET` (Bearer token). |
| `WORKER_CALLBACK_APP_URL` | **Recommended:** public origin of the Next app for callbacks (e.g. `https://www.mybestlife-os.com`). Falls back to `APP_CALLBACK_URL`, then `NEXT_PUBLIC_APP_URL`. **Use the canonical production URL that does not 301/302/307 to a different host** — the worker treats only HTTP **200** from the callback as success (redirects followed must end on 200). |
| `SUPABASE_URL` | Project URL (**required** for uploads of MinerU outputs into `knowledge-files`). |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (**required** for Storage upload). `NEXT_PUBLIC_*` keys alone are not enough on the worker. |
| `MINERU_PARSER_VERSION_LABEL` | Optional override for `parser_version` on completed jobs. If unset: `mineru-official-api-{MINERU_MODEL_VERSION}` when `official_api`, else `mineru-pipeline-worker` for `local_cli`. |
| `MINERU_BACKEND` | **local_cli only:** CLI backend (default `pipeline`). |
| `MINERU_SUBPROCESS_TIMEOUT_SEC` | **local_cli only:** max seconds for the `mineru` subprocess (default `600`). |
| `NEXT_PUBLIC_APP_URL` | Legacy alias: same as callback base if `WORKER_CALLBACK_APP_URL` unset. |
| `MINERU_INTERNAL_API_URL` | **local_cli + Docker:** set by `docker-entrypoint.sh` (default `http://127.0.0.1:8877`). The `mineru` CLI uses `--api-url` against in-container `mineru-api`. |
| `MINERU_API_HOST` / `MINERU_API_PORT` | **local_cli + Docker:** optional overrides for internal `mineru-api` bind address. |
| `GEMINI_API_KEY` | **Optional.** When set, the worker enriches up to `DOCORACLE_VISUAL_GEMINI_LIMIT` visual assets per document with Gemini multimodal JSON (title, description, semantic category, tags). Never log this value. |
| `DOCORACLE_VISUAL_GEMINI_LIMIT` | Max visuals per document to send to Gemini (default `40`). |
| `DOCORACLE_VISUAL_GEMINI_MODEL` | Optional Gemini model id (default `gemini-2.0-flash`). |

Official API jobs POST `https://mineru.net/api/v4/extract/task` with the **same signed Supabase URL** the app sent to the worker (`url` field). MinerU’s servers must be able to fetch that URL; if extraction fails with timeouts, ensure the signed URL is reachable from their network (see MinerU docs on URL / region limits).

## Local vs production

| Where the Next app runs | `MINERU_API_URL` (on Vercel / app) | Worker `WORKER_CALLBACK_APP_URL` |
|-------------------------|-----------------------------------|-----------------------------------|
| `localhost:3000` | `http://127.0.0.1:8790` (worker on same machine) | `http://127.0.0.1:3000` |
| `https://www.mybestlife-os.com` | **Public HTTPS URL** of your deployed worker (Railway/Fly/Render/VPS), **not** `127.0.0.1` | `https://www.mybestlife-os.com` |

Vercel cannot call a worker only listening on your laptop; deploy the worker and set `MINERU_API_URL` in the Vercel project env to that URL.

### Vercel (Next app) env

| Name | Example |
|------|---------|
| `MINERU_API_URL` | `https://mybestlife-os-production.up.railway.app` (your worker base URL, no trailing slash) |
| `MINERU_WORKER_SECRET` | Same value as on Railway |
| `MINERU_MODE` | `http` |

## Deploy on Railway

### Before you deploy (“path does not exist”)

Railway clones **whatever is on GitHub**, not your laptop-only files.

1. In the browser, open:  
   `https://github.com/<your-org>/<your-repo>/tree/<branch>/services/mineru-worker`  
   You must see `Dockerfile`, `src/`, `requirements.txt`, etc. If you get **404**, Railway will fail with:  
   *“The root directory is set to `services/mineru-worker`, but that path does not exist in the repository.”*
2. **Fix:** from the machine where this folder exists, commit and push it to the **same** repo and branch Railway uses (usually `main`):

   ```bash
   git add services/mineru-worker
   git status   # confirm Dockerfile, src/, railway.toml, etc. are staged
   git commit -m "Add MinerU worker service for Railway"
   git push origin main
   ```

3. **Wrong repo:** If the GitHub repo you linked only contains the Next app at the root (no `services/` folder), either connect Railway to the **monorepo** that includes `services/mineru-worker`, or copy this folder into that repo and push.

After the folder appears on GitHub, trigger **Redeploy** on Railway.

---

4. **Create a Railway project** → **Deploy from GitHub** → pick this repo.
5. Open the new service → **Settings** → **Root Directory** → set to `services/mineru-worker`  
   (so the Docker build context matches this folder and `railway.toml` is picked up).
6. **Variables** — production (official API) example:

   | Name | Example |
   |------|---------|
   | `MINERU_ENGINE_PROVIDER` | `official_api` |
   | `MINERU_OFFICIAL_API_TOKEN` | From MinerU account (never log or expose). |
   | `MINERU_OFFICIAL_API_BASE_URL` | `https://mineru.net` |
   | `MINERU_MODEL_VERSION` | `vlm` |
   | `MINERU_ENABLE_TABLE` | `true` |
   | `MINERU_ENABLE_FORMULA` | `true` |
   | `WORKER_CALLBACK_APP_URL` | `https://www.mybestlife-os.com` |
   | `MINERU_WORKER_SECRET` | Long random string — **must equal** Vercel `MINERU_WORKER_SECRET`. |
   | `SUPABASE_URL` | Your Supabase project URL (**required** for uploading MinerU outputs). |
   | `SUPABASE_SERVICE_ROLE_KEY` | Service role key (**required** for Storage upload). |

   Railway injects **`PORT`**; the image listens on `$PORT` automatically (see `docker-entrypoint.sh`).

   **Startup order (Docker):** the entrypoint starts **`mineru-api`** on an internal port, waits until `/openapi.json` responds, then starts **uvicorn** on `$PORT`. That stack is used when `MINERU_ENGINE_PROVIDER=local_cli`. For **`official_api`**, parsing runs against MinerU’s cloud API; the internal `mineru-api` process still starts today (harmless) but is not required for cloud extraction.

7. **Networking** → **Generate domain** (or add a custom domain). You get a URL like `https://your-service.up.railway.app`.
8. In **Vercel** (Next app): set `MINERU_API_URL` to that **HTTPS base URL** with **no** trailing slash, e.g. `https://your-service.up.railway.app`.
9. Redeploy the Next app (or wait for the next deploy) so env vars load, then **upload a new PDF** (or retry extraction) so a job hits the Railway worker.

Health check: `GET /health` → `{"status":"ok"}`.

Worker diagnostics (no secrets): `GET /debug/mineru-engine` → provider, whether the official token is configured, base URL, model version, table/formula flags.

### Docker build notes (Railway)

Installing `mineru[pipeline]` still pulls **PyTorch** and related wheels — expect a **large image** and a **long first build**. If the build OOMs or times out, increase the builder resources / timeout in Railway or use a machine type with more RAM. With **`official_api`**, runtime extraction does not depend on the local CLI succeeding, but the image still installs MinerU for optional `local_cli` use.

## Run locally

```bash
cd services/mineru-worker
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export MINERU_WORKER_SECRET=devsecret
export SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE_KEY=...
export NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
# Official API path (recommended):
export MINERU_ENGINE_PROVIDER=official_api
export MINERU_OFFICIAL_API_TOKEN=...
export MINERU_OFFICIAL_API_BASE_URL=https://mineru.net
# Or explicitly:
# export WORKER_CALLBACK_APP_URL=http://127.0.0.1:3000
uvicorn src.main:app --host 0.0.0.0 --port 8790
```

Point the app at `MINERU_API_URL=http://127.0.0.1:8790`.

> **Note:** `pip install -r requirements.txt` pulls **MinerU (pipeline)**, **Supabase**, and the API stack in one resolution step (heavy: PyTorch, etc.). Prefer Docker for a predictable environment.

## Behavior

The HTTP handler returns **202 Accepted** immediately and runs **download → MinerU (official API or local CLI) → unzip/output layout → upload full tree to Supabase → Vercel callback** in a **background task**, so long parses do not block the Vercel dispatch `fetch` timeout.

- **`official_api`:** Submit task → poll `GET /api/v4/extract/task/{task_id}` → download `full_zip_url` → extract under `output/` → upload **all** files under that tree (Markdown, JSON, images, etc.). Jobs are only marked completed when primary Markdown exists and at least one file was uploaded.
- **`local_cli`:** Runs the `mineru` subprocess (with `--api-url` when `MINERU_INTERNAL_API_URL` is set).

If extraction fails, the worker POSTs `status: "failed"` with `error_code` / `error_message` (official API failures use `mineru_official_api_failed` and a short API/snippet message) so jobs do not stay stuck in `queued` / `parsing` forever.

### Vercel env (optional)

| Name | Purpose |
|------|---------|
| `MINERU_DISPATCH_TIMEOUT_MS` | Max ms to wait for the worker to **accept** the job (HTTP 202). Default `120000`. Increase only if your Railway service is extremely slow to cold-start. |

### Debug from the Next app

`GET /api/document-brain/debug/mineru` — returns whether `MINERU_API_URL` / `MINERU_WORKER_SECRET` are set, the normalized worker base, and the result of `GET {MINERU_API_URL}/health` (no secrets in the JSON).

On the worker host: `GET {MINERU_API_URL}/debug/mineru-engine` — engine provider and safe config (never includes the API token).
