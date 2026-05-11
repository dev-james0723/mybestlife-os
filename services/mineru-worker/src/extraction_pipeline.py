"""End-to-end extraction: download → MinerU (official API or local CLI) → storage upload → callback."""

from __future__ import annotations

import asyncio
import logging
import os
import traceback
from pathlib import Path

import httpx

from .docoracle_normalizer import DocOracleNormalizationError, normalize_doc_oracle
from .download_input import DownloadError, download_signed_pdf
from .mineru_artifact_inspector import inspect_mineru_output
from .mineru_engine import MinerUOfficialApiError, get_engine_provider, model_version, run_official_api_extract
from .mineru_runner import MinerUCliError, assert_mineru_cli_available, pick_primary_markdown, run_mineru_cli
from .storage_sync import get_supabase_client, upload_storage_object, upload_tree_under_prefix

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


def _parser_version_label(provider: str) -> str:
    custom = os.environ.get("MINERU_PARSER_VERSION_LABEL", "").strip()
    if custom:
        return custom
    if provider == "official_api":
        return f"mineru-official-api-{model_version()}"
    return "mineru-pipeline-worker"


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
        async with httpx.AsyncClient(timeout=300.0, follow_redirects=True) as c:
            return await post_job_callback(client=c, callback_url=callback_url, secret=secret, payload=pl)

    if not base or not secret:
        log.error("[mineru-worker] extraction_aborted missing_callback_env job_id=%s", job_id)
        return

    work_root = Path("/tmp/doc-oracle") / job_id
    input_pdf = work_root / "input" / "source.pdf"
    output_dir = work_root / "output"
    storage_raw_prefix = f"{output_base_path.rstrip('/')}/mineru/raw"

    provider = get_engine_provider()
    log.info("[mineru-worker] extraction_start job_id=%s engine_provider=%s", job_id, provider)

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

        md_path: Path | None = None
        total_pages = 0

        if provider == "official_api":
            if not os.environ.get("MINERU_OFFICIAL_API_TOKEN", "").strip():
                await send(
                    "failed",
                    progress=0,
                    current_stage=None,
                    output_base_path=output_base_path,
                    error_code="mineru_official_api_failed",
                    error_message="MINERU_OFFICIAL_API_TOKEN is not set",
                )
                return

            log.info(
                "[mineru-worker] official_api_extract job_id=%s model_version=%s",
                job_id,
                model_version(),
            )
            api_timeout = httpx.Timeout(120.0, connect=30.0)
            try:
                async with httpx.AsyncClient(timeout=api_timeout, follow_redirects=True) as api_client:
                    md_path, total_pages = await run_official_api_extract(
                        client=api_client,
                        signed_source_url=signed_input_url,
                        output_dir=output_dir,
                        job_id=job_id,
                    )
            except MinerUOfficialApiError as e:
                await send(
                    "failed",
                    progress=0,
                    current_stage=None,
                    output_base_path=output_base_path,
                    error_code="mineru_official_api_failed",
                    error_message=str(e)[:2000],
                )
                return
        else:
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
            log.info(
                "[mineru-worker] local_cli_extract job_id=%s backend=%s model_version=n/a_cli",
                job_id,
                backend,
            )

            try:
                await asyncio.to_thread(
                    run_mineru_cli,
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

        if md_path is None:
            await send(
                "failed",
                progress=0,
                current_stage=None,
                output_base_path=output_base_path,
                error_code="mineru_no_output",
                error_message="No primary markdown produced after extraction",
            )
            return

        await send(
            "normalizing",
            progress=55,
            current_stage="Inspecting MinerU output",
            output_base_path=output_base_path,
        )

        manifest = await asyncio.to_thread(inspect_mineru_output, output_dir)
        log.info(
            "[mineru-worker] manifest_ready job_id=%s primary_md=%s images=%s est_pages=%s",
            job_id,
            manifest.get("primary_markdown_path"),
            len(manifest.get("image_files") or []),
            manifest.get("estimated_total_pages"),
        )

        await send(
            "normalizing",
            progress=70,
            current_stage="Uploading MinerU artifacts",
            output_base_path=output_base_path,
        )

        try:
            sb = get_supabase_client()
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

        log.info("[mineru-worker] upload_completed job_id=%s files=%s provider=%s", job_id, n, provider)

        manifest_dest = f"{output_base_path.rstrip('/')}/mineru/manifest.json"
        try:
            sb2 = get_supabase_client()
            await asyncio.to_thread(
                upload_storage_object,
                client=sb2,
                storage_path=manifest_dest,
                data=__import__("json")
                .dumps(manifest, ensure_ascii=False, indent=2)
                .encode("utf-8"),
                content_type="application/json",
            )
        except Exception as e:
            log.exception("[mineru-worker] manifest_upload_failed job_id=%s", job_id)
            await send(
                "failed",
                progress=0,
                current_stage=None,
                output_base_path=output_base_path,
                error_code="manifest_upload_failed",
                error_message=f"{type(e).__name__}: {str(e)}"[:2000],
            )
            return

        await send(
            "normalizing",
            progress=80,
            current_stage="Normalizing Doc Oracle data",
            output_base_path=output_base_path,
        )

        parser_ver = _parser_version_label(provider)
        input_storage_path = str(body.get("input_storage_path") or "")

        try:
            sb3 = get_supabase_client()
            title_res = (
                sb3.table("knowledge_items")
                .select("title")
                .eq("id", document_id)
                .eq("user_id", user_id)
                .limit(1)
                .execute()
            )
            doc_title = "Document"
            if title_res.data and isinstance(title_res.data[0], dict):
                t = title_res.data[0].get("title")
                if isinstance(t, str) and t.strip():
                    doc_title = t.strip()[:500]

            norm_stats = await asyncio.to_thread(
                normalize_doc_oracle,
                client=sb3,
                user_id=user_id,
                document_id=document_id,
                output_base_path=output_base_path,
                output_dir=output_dir,
                manifest=manifest,
                parser_version=parser_ver,
                document_title=doc_title,
                input_storage_path=input_storage_path,
                total_pages_hint=total_pages,
            )
        except DocOracleNormalizationError as e:
            log.exception("[mineru-worker] docoracle_normalization_failed job_id=%s", job_id)
            await send(
                "failed",
                progress=0,
                current_stage=None,
                output_base_path=output_base_path,
                error_code="docoracle_normalization_failed",
                error_message=str(e)[:2000],
            )
            return
        except Exception as e:
            log.exception("[mineru-worker] docoracle_normalization_unhandled job_id=%s", job_id)
            await send(
                "failed",
                progress=0,
                current_stage=None,
                output_base_path=output_base_path,
                error_code="docoracle_normalization_failed",
                error_message=f"{type(e).__name__}: {str(e)}"[:2000],
            )
            return

        await send(
            "normalizing",
            progress=90,
            current_stage="Building pages, sections, chunks, visuals, glossary",
            output_base_path=output_base_path,
        )

        executive = str(norm_stats.get("executive_summary") or "")[:8000]
        kb_raw = str(norm_stats.get("kb_raw_content") or "")[:100_000]
        pages_out = int(norm_stats.get("total_pages") or total_pages or 0)
        doc_type_out = str(norm_stats.get("document_type") or "document")[:64]
        lang_out = norm_stats.get("language")
        lang_s = str(lang_out)[:32] if lang_out else None

        ok, st, _detail = await send(
            "completed",
            progress=100,
            current_stage="Completed",
            output_base_path=output_base_path,
            document_summary=executive,
            kb_raw_content=kb_raw,
            total_pages=pages_out,
            parser_version=parser_ver,
            manifest_storage_path=manifest_dest,
            document_type=doc_type_out,
            language=lang_s,
        )
        if ok:
            log.info(
                "[mineru-worker] callback_completed job_id=%s http=%s provider=%s",
                job_id,
                st,
                provider,
            )
        else:
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
