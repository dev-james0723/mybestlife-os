import logging
import os
from contextlib import asynccontextmanager

from fastapi import BackgroundTasks, FastAPI, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from .auth import require_worker_secret
from .extraction_pipeline import run_extraction_job
from .mineru_engine import debug_engine_config

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    logging.basicConfig(
        level=logging.INFO,
        format="%(levelname)s %(name)s %(message)s",
    )
    yield


app = FastAPI(title="MyLifeOS MinerU Worker", version="0.3.0", lifespan=lifespan)


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


@app.get("/debug/mineru-engine")
def debug_mineru_engine():
    """Safe diagnostics for MinerU engine configuration (never exposes API token)."""
    return debug_engine_config()


@app.post("/v1/extract")
async def extract(
    body: ExtractBody,
    background_tasks: BackgroundTasks,
    authorization: str | None = Header(default=None),
):
    require_worker_secret(authorization)

    has_signed = bool(body.signed_input_url and body.signed_input_url.strip())
    log.info(
        "[mineru-worker] /v1/extract job_id=%s document_id=%s user_id=%s signed_input_url_present=%s "
        "output_base_path_tail=%s input_storage_path_tail=%s",
        body.job_id,
        body.document_id,
        body.user_id,
        has_signed,
        body.output_base_path[-80:] if body.output_base_path else "",
        body.input_storage_path[-80:] if body.input_storage_path else "",
    )

    raw_base = (
        os.environ.get("WORKER_CALLBACK_APP_URL", "").strip()
        or os.environ.get("APP_CALLBACK_URL", "").strip()
        or os.environ.get("NEXT_PUBLIC_APP_URL", "").strip()
    )
    base = _origin_with_scheme(raw_base).rstrip("/")
    secret = os.environ.get("MINERU_WORKER_SECRET", "").strip()
    if not base or not secret:
        log.warning(
            "[mineru-worker] /v1/extract reject_missing_callback_env job_id=%s has_callback_base=%s has_secret=%s",
            body.job_id,
            bool(base),
            bool(secret),
        )
        return JSONResponse(
            status_code=503,
            content={
                "ok": False,
                "error": "callback_skipped_missing_env",
                "hint": "Set WORKER_CALLBACK_APP_URL (your live Next.js origin, e.g. https://mybestlife-os.com) "
                "and MINERU_WORKER_SECRET on this Railway service.",
            },
        )

    callback_url = f"{base}/api/document-brain/worker/job-status"
    log.info(
        "[mineru-worker] /v1/extract enqueue job_id=%s callback_host=%s",
        body.job_id,
        callback_url.split("://", 1)[-1].split("/", 1)[0] if "://" in callback_url else "(relative?)",
    )

    background_tasks.add_task(run_extraction_job, body.model_dump())

    return JSONResponse(
        status_code=202,
        content={
            "ok": True,
            "accepted": True,
            "job_id": body.job_id,
            "detail": "Extraction started; status updates POST to the Vercel callback URL.",
        },
    )
