# MinerU worker (My Best Life OS)

Separate service that receives extraction jobs from the Next.js app, downloads the source PDF via signed URL, runs [MinerU](https://github.com/opendatalab/MinerU), uploads outputs to Supabase Storage, then calls back:

`POST {WORKER_CALLBACK_APP_URL or NEXT_PUBLIC_APP_URL}/api/document-brain/worker/job-status`

## Environment

| Variable | Purpose |
|----------|---------|
| `MINERU_WORKER_SECRET` | Must match app `MINERU_WORKER_SECRET` (Bearer token). |
| `WORKER_CALLBACK_APP_URL` | **Recommended:** public origin of the Next app for callbacks (e.g. `https://www.mybestlife-os.com`). Falls back to `APP_CALLBACK_URL`, then `NEXT_PUBLIC_APP_URL`. **Use the canonical production URL that does not 301/302/307 to a different host** — the worker treats only HTTP **200** from the callback as success (redirects followed must end on 200). |
| `SUPABASE_URL` | Project URL (**required** for uploads of MinerU outputs into `knowledge-files`). |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (**required** for Storage upload). `NEXT_PUBLIC_*` keys alone are not enough on the worker. |
| `MINERU_BACKEND` | Parsing backend for the CLI (default `pipeline`, CPU-friendly). |
| `MINERU_SUBPROCESS_TIMEOUT_SEC` | Max seconds for the `mineru` subprocess (default `600`). |
| `MINERU_PARSER_VERSION_LABEL` | Optional string stored as `parser_version` on completed jobs (default `mineru-pipeline-worker`). |
| `NEXT_PUBLIC_APP_URL` | Legacy alias: same as callback base if `WORKER_CALLBACK_APP_URL` unset. |

## Local vs production

| Where the Next app runs | `MINERU_API_URL` (on Vercel / app) | Worker `WORKER_CALLBACK_APP_URL` |
|-------------------------|-----------------------------------|-----------------------------------|
| `localhost:3000` | `http://127.0.0.1:8790` (worker on same machine) | `http://127.0.0.1:3000` |
| `https://www.mybestlife-os.com` | **Public HTTPS URL** of your deployed worker (Railway/Fly/Render/VPS), **not** `127.0.0.1` | `https://www.mybestlife-os.com` |

Vercel cannot call a worker only listening on your laptop; deploy the worker and set `MINERU_API_URL` in the Vercel project env to that URL.

## Deploy on Railway

### Before you deploy (avoids “path does not exist”)

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
6. **Variables** (same values conceptually as local; use production URLs):

   | Name | Example |
   |------|---------|
   | `MINERU_WORKER_SECRET` | Long random string — **must equal** Vercel `MINERU_WORKER_SECRET`. |
   | `WORKER_CALLBACK_APP_URL` | `https://www.mybestlife-os.com` |
   | `SUPABASE_URL` | Your Supabase project URL (**required** for uploading MinerU outputs). |
   | `SUPABASE_SERVICE_ROLE_KEY` | Service role key (**required** for Storage upload). |

   Railway injects **`PORT`**; the image listens on `$PORT` automatically (see `docker-entrypoint.sh`).

7. **Networking** → **Generate domain** (or add a custom domain). You get a URL like `https://your-service.up.railway.app`.
8. In **Vercel** (Next app): set `MINERU_API_URL` to that **HTTPS base URL** with **no** trailing slash, e.g. `https://your-service.up.railway.app`.
9. Redeploy the Next app (or wait for the next deploy) so env vars load, then **upload a new PDF** (or retry extraction) so a job hits the Railway worker.

Health check: `GET /health` → `{"status":"ok"}`.

### Docker build notes (Railway)

Installing `mineru[all]` pulls **PyTorch** and related wheels — expect a **large image** and a **long first build** (often many minutes). If the build OOMs or times out, increase the builder resources / timeout in Railway or use a machine type with more RAM. The worker still **fails honestly at runtime** with `mineru_cli_missing` if the CLI is not present after install.

## Run locally

```bash
cd services/mineru-worker
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export MINERU_WORKER_SECRET=devsecret
export SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE_KEY=...
export NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
# Or explicitly:
# export WORKER_CALLBACK_APP_URL=http://127.0.0.1:3000
uvicorn src.main:app --host 0.0.0.0 --port 8790
```

Point the app at `MINERU_API_URL=http://127.0.0.1:8790`.

> **Note:** `pip install -r requirements.txt` installs **MinerU** and is heavy (PyTorch, etc.). Prefer Docker for a predictable environment.

## Behavior

The Docker image installs **`mineru[all]`** from PyPI (see MinerU docs). The HTTP handler returns **202 Accepted** immediately and runs download → MinerU → Supabase upload → Vercel callback in a **background task**, so long parses do not block the Vercel dispatch `fetch` timeout.

If the MinerU CLI is missing or extraction fails, the worker POSTs `status: "failed"` with `error_code` / `error_message` so `document_extraction_jobs` does not stay `queued` forever.

### Vercel env (optional)

| Name | Purpose |
|------|---------|
| `MINERU_DISPATCH_TIMEOUT_MS` | Max ms to wait for the worker to **accept** the job (HTTP 202). Default `120000`. Increase only if your Railway service is extremely slow to cold-start. |

### Debug from the Next app

`GET /api/document-brain/debug/mineru` — returns whether `MINERU_API_URL` / `MINERU_WORKER_SECRET` are set, the normalized worker base, and the result of `GET {MINERU_API_URL}/health` (no secrets in the JSON).
