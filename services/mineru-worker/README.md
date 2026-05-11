# MinerU worker (My Best Life OS)

Separate service that receives extraction jobs from the Next.js app, downloads the source PDF via signed URL, runs [MinerU](https://github.com/opendatalab/MinerU), uploads outputs to Supabase Storage, then calls back:

`POST {WORKER_CALLBACK_APP_URL or NEXT_PUBLIC_APP_URL}/api/document-brain/worker/job-status`

## Environment

| Variable | Purpose |
|----------|---------|
| `MINERU_WORKER_SECRET` | Must match app `MINERU_WORKER_SECRET` (Bearer token). |
| `WORKER_CALLBACK_APP_URL` | **Recommended:** public origin of the Next app for callbacks (e.g. `https://www.mybestlife-os.com`). Falls back to `APP_CALLBACK_URL`, then `NEXT_PUBLIC_APP_URL`. |
| `SUPABASE_URL` | Project URL (optional for stub; needed for real Storage I/O). |
| `SUPABASE_SERVICE_ROLE_KEY` | Upload parsed assets / optional direct download. |
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
   | `SUPABASE_URL` | Your Supabase project URL (stub optional; real MinerU I/O needs it). |
   | `SUPABASE_SERVICE_ROLE_KEY` | Service role key (stub optional). |

   Railway injects **`PORT`**; the image listens on `$PORT` automatically (see `docker-entrypoint.sh`).

7. **Networking** → **Generate domain** (or add a custom domain). You get a URL like `https://your-service.up.railway.app`.
8. In **Vercel** (Next app): set `MINERU_API_URL` to that **HTTPS base URL** with **no** trailing slash, e.g. `https://your-service.up.railway.app`.
9. Redeploy the Next app (or wait for the next deploy) so env vars load, then **upload a new PDF** (or retry extraction) so a job hits the Railway worker.

Health check: `GET /health` → `{"status":"ok"}`.

## Run locally

```bash
cd services/mineru-worker
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export MINERU_WORKER_SECRET=devsecret
export SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE_KEY=...
export NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
# Or explicitly (same effect for stub):
# export WORKER_CALLBACK_APP_URL=http://127.0.0.1:3000
uvicorn src.main:app --host 0.0.0.0 --port 8790
```

Point the app at `MINERU_API_URL=http://127.0.0.1:8790`.

The default image runs a **stub** pipeline (no real MinerU CLI) so you can verify job flow end-to-end. Replace `src/mineru_runner.py` with real MinerU invocation for production.
