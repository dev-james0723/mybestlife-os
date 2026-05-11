import os
from fastapi import FastAPI, Header
from pydantic import BaseModel

from .auth import require_worker_secret
from .mineru_runner import run_mineru_stub

app = FastAPI(title="MyLifeOS MinerU Worker", version="0.1.0")


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
    base = (
        os.environ.get("WORKER_CALLBACK_APP_URL", "").strip()
        or os.environ.get("APP_CALLBACK_URL", "").strip()
        or os.environ.get("NEXT_PUBLIC_APP_URL", "").strip()
    ).rstrip("/")
    secret = os.environ.get("MINERU_WORKER_SECRET", "").strip()
    if not base or not secret:
        return {"ok": True, "warning": "callback_skipped_missing_env"}

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
            return {"ok": False, "callback_status": r.status_code, "body": r.text[:500]}
    return {"ok": True, "callback_status": r.status_code}
