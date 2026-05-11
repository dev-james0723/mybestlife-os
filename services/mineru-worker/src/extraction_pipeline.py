"""End-to-end extraction: download → MinerU → storage upload → optional summary → callback."""

from __future__ import annotations

import asyncio
import logging
import os
import traceback
from pathlib import Path

import httpx

from .download_input import DownloadError, download_signed_pdf
from .mineru_runner import MinerUCliError, assert_mineru_cli_available, pick_primary_markdown, run_mineru_cli
from .storage_sync import get_supabase_client, upload_tree_under_prefix

log = logging.getLogger(__name__)

STORAGE_BUCKET = "knowledge-files"


def _origin_with_scheme(raw: str) -> str:
    b = raw.strip().rstrip("/")
    if not b:
        return ""
    lower = b.lower()
    if not lower.startswith("http://") and not lower.startswith("https://"):
        return f"https://{b}"
    return b


def _callback_base_and_secret() -> tuple[str, str]:
    raw_base = (
        os.environ.get("WORKER_CALLBACK_APP_URL", "").strip()
        or os.environ.get("APP_CALLBACK_URL", "").strip()
        or os.environ.get("NEXT_PUBLIC_APP_URL", "").strip()
    )
    base = _origin_with_scheme(raw_base).rstrip("/")
    secret = os.environ.get("MINERU_WORKER_SECRET", "").strip()
    return base, secret


async def post_job_callback(
    *,
    client: httpx.AsyncClient,
    callback_url: str,
    secret: str,
    payload: dict,
) -> tuple[bool, int, str]:
    """
    POST callback. Success only when final HTTP status is exactly 200.
    Returns (ok, status_code, detail_snippet).
    """
    try:
        r = await client.post(
            callback_url,
            json=payload,
            headers={"Authorization": f"Bearer {secret}"},
        )
    except httpx.RequestError as e:
        return False, 0, f"callback_request_error:{type(e).__name__}"
    text = (r.text or "")[:500]
    if r.status_code != 200:
        return False, r.status_code, text
    return True, r.status_code, text


async def run_extraction_job(body: dict) -> None:
    """
    Background task: full pipeline + always attempts terminal callback.
    `body` matches ExtractBody fields as dict.
    """
    job_id = str(body.get("job_id") or "")
    user_id = str(body.get("user_id") or "")
    document_id = str(body.get("document_id") or "")
    signed_input_url = str(body.get("signed_input_url") or "")
    output_base_path = str(body.get("output_base_path") or "")

    base, secret = _callback_base_and_secret()
    callback_url = f"{base}/api/document-brain/worker/job-status" if base else ""

    async def send(status: str, **extra: object) -> tuple[bool, int, str]:
        pl: dict = {
            "job_id": job_id,
            "user_id": user_id,
            "document_id": document_id,
            "status": status,
        }
        pl.update(extra)
        if not callback_url or not secret:
            log.error("[mineru-worker] callback_missing_env cannot_notify job_id=%s", job_id)
            return False, 0, "callback_env_missing"
        async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as c:
            return await post_job_callback(client=c, callback_url=callback_url, secret=secret, payload=pl)

    if not base or not secret:
        log.error("[mineru-worker] extraction_aborted missing_callback_env job_id=%s", job_id)
        return

    work_root = Path("/tmp/doc-oracle") / job_id
    input_pdf = work_root / "input" / "source.pdf"
    output_dir = work_root / "output"
    storage_raw_prefix = f"{output_base_path.rstrip('/')}/mineru/raw"

    try:
        await send(
            "processing",
            progress=5,
            current_stage="Downloading source PDF",
            output_base_path=output_base_path,
        )

        if not signed_input_url.strip():
            await send(
                "failed",
                progress=0,
                current_stage=None,
                output_base_path=output_base_path,
                error_code="missing_signed_url",
                error_message="signed_input_url was empty",
            )
            return

        try:
            await download_signed_pdf(signed_input_url=signed_input_url, dest=input_pdf, timeout_sec=120.0)
        except DownloadError as e:
            msg = str(e)
            if e.http_status is not None:
                msg = f"HTTP {e.http_status}: {msg}"
            await send(
                "failed",
                progress=0,
                current_stage=None,
                output_base_path=output_base_path,
                error_code="download_failed",
                error_message=msg[:2000],
            )
            return

        log.info(
            "[mineru-worker] download_ok job_id=%s bytes=%s",
            job_id,
            input_pdf.stat().st_size,
        )

        await send(
            "parsing",
            progress=25,
            current_stage="Running MinerU",
            output_base_path=output_base_path,
        )

        try:
            assert_mineru_cli_available()
        except MinerUCliError as e:
            await send(
                "failed",
                progress=0,
                current_stage=None,
                output_base_path=output_base_path,
                error_code="mineru_cli_missing",
                error_message=str(e)[:2000],
            )
            return

        backend = os.environ.get("MINERU_BACKEND", "pipeline").strip() or "pipeline"
        timeout_sec = int(os.environ.get("MINERU_SUBPROCESS_TIMEOUT_SEC", "600") or "600")

        try:
            run_mineru_cli(
                input_pdf=input_pdf,
                output_dir=output_dir,
                backend=backend,
                timeout_sec=timeout_sec,
            )
        except MinerUCliError as e:
            await send(
                "failed",
                progress=0,
                current_stage=None,
                output_base_path=output_base_path,
                error_code="mineru_failed",
                error_message=str(e)[:2000],
            )
            return

        md_path = pick_primary_markdown(output_dir)
        if md_path is None:
            await send(
                "failed",
                progress=0,
                current_stage=None,
                output_base_path=output_base_path,
                error_code="mineru_no_output",
                error_message="MinerU produced no markdown output under the output directory",
            )
            return

        await send(
            "normalizing",
            progress=70,
            current_stage="Uploading MinerU outputs to storage",
            output_base_path=output_base_path,
        )

        try:
            sb = get_supabase_client()
            # MinerU may write a nested folder under output_dir; upload entire tree.
            n = await asyncio.to_thread(
                upload_tree_under_prefix,
                client=sb,
                local_root=output_dir,
                storage_prefix=storage_raw_prefix,
            )
            if n == 0:
                raise RuntimeError("no_files_uploaded")
        except Exception as e:
            log.exception("[mineru-worker] upload_phase_failed job_id=%s", job_id)
            await send(
                "failed",
                progress=0,
                current_stage=None,
                output_base_path=output_base_path,
                error_code="storage_upload_failed",
                error_message=f"{type(e).__name__}: {str(e)}"[:2000],
            )
            return

        summary_text = md_path.read_text(encoding="utf-8", errors="replace")[:12000]
        parser_ver = os.environ.get("MINERU_PARSER_VERSION_LABEL", "mineru-pipeline-worker").strip() or "mineru-pipeline-worker"

        ok, st, _detail = await send(
            "completed",
            progress=100,
            current_stage="MinerU extraction finished",
            output_base_path=output_base_path,
            document_summary=summary_text,
            total_pages=0,
            parser_version=parser_ver,
        )
        if not ok:
            log.error(
                "[mineru-worker] terminal_callback_not_200 job_id=%s status=%s",
                job_id,
                st,
            )
    except Exception:
        log.exception("[mineru-worker] extraction_unhandled job_id=%s", job_id)
        try:
            await send(
                "failed",
                progress=0,
                current_stage=None,
                output_base_path=output_base_path,
                error_code="worker_internal_error",
                error_message=traceback.format_exc()[-2000:],
            )
        except Exception:
            log.exception("[mineru-worker] failed_to_send_failure_callback job_id=%s", job_id)
