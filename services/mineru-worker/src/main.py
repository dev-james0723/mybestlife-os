import os
from fastapi import FastAPI, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from .auth import require_worker_secret
from .mineru_runner import run_mineru_stub

app = FastAPI(title="MyLifeOS MinerU Worker", version="0.1.0")


def _origin_with_scheme(raw: str) -> str:
    """Callback URL must be absolute; env values often omit https://."""
    b = raw.strip().rstrip("/")
    if not b:
        return ""
    lower = b.lower()
    if not lower.startswith("http://") and not lower.startswith("https://"):
        return f"https://{b}"
    return b


class ExtractBody(BaseModel):
    job_id: str
    user_id: str
    document_id: str
    signed_input_url: str
    input_storage_path: str
    output_base_path: str
    parser_mode: str | None = None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/v1/extract")
async def extract(
    body: ExtractBody,
    authorization: str | None = Header(default=None),
):
    require_worker_secret(authorization)
    # Stub: skip download / MinerU; real implementation would stream progress updates.
    _ = body.signed_input_url
    run_mineru_stub(output_base_path=body.output_base_path)

    # Where the Next app receives POST /api/document-brain/worker/job-status.
    # Prefer WORKER_CALLBACK_APP_URL on the worker (e.g. https://www.mybestlife-os.com) so
    # production workers are not tied to NEXT_PUBLIC_* naming.
    raw_base = (
        os.environ.get("WORKER_CALLBACK_APP_URL", "").strip()
        or os.environ.get("APP_CALLBACK_URL", "").strip()
        or os.environ.get("NEXT_PUBLIC_APP_URL", "").strip()
    )
    base = _origin_with_scheme(raw_base).rstrip("/")
    secret = os.environ.get("MINERU_WORKER_SECRET", "").strip()
    if not base or not secret:
        # Non-2xx so the Next.js caller treats dispatch as failed and can run local fallback
        # instead of leaving document_extraction_jobs stuck at "queued" forever.
        return JSONResponse(
            status_code=503,
            content={
                "ok": False,
                "error": "callback_skipped_missing_env",
                "hint": "Set WORKER_CALLBACK_APP_URL (your live Next.js origin, e.g. https://mybestlife-os.com) "
                "and MINERU_WORKER_SECRET on this Railway service.",
            },
        )

    import httpx

    callback_url = f"{base}/api/document-brain/worker/job-status"
    payload = {
        "job_id": body.job_id,
        "user_id": body.user_id,
        "document_id": body.document_id,
        "status": "completed",
        "progress": 100,
        "current_stage": "Stub worker finished",
        "output_base_path": body.output_base_path,
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(
            callback_url,
            json=payload,
            headers={"Authorization": f"Bearer {secret}"},
        )
        if r.status_code >= 400:
            return JSONResponse(
                status_code=502,
                content={
                    "ok": False,
                    "callback_status": r.status_code,
                    "body": r.text[:500],
                    "callback_url": callback_url,
                },
            )
    return {"ok": True, "callback_status": r.status_code}
