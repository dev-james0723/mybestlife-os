"""MinerU extraction backends: official Precision API (default) or local CLI (legacy)."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import shutil
import zipfile
from pathlib import Path
from typing import Any, Literal

import httpx

from .mineru_runner import pick_primary_markdown

log = logging.getLogger(__name__)

EngineProvider = Literal["official_api", "local_cli"]


class MinerUOfficialApiError(Exception):
    """Raised when MinerU Precision Extract API returns an error or times out."""

    pass


def get_engine_provider() -> EngineProvider:
    v = os.environ.get("MINERU_ENGINE_PROVIDER", "official_api").strip().lower()
    if v == "local_cli":
        return "local_cli"
    return "official_api"


def _env_bool(key: str, default: bool) -> bool:
    raw = os.environ.get(key, "").strip().lower()
    if not raw:
        return default
    return raw in ("1", "true", "yes", "on")


def official_api_base_url() -> str:
    return os.environ.get("MINERU_OFFICIAL_API_BASE_URL", "https://mineru.net").strip().rstrip("/")


def official_api_token() -> str:
    return os.environ.get("MINERU_OFFICIAL_API_TOKEN", "").strip()


def model_version() -> str:
    return os.environ.get("MINERU_MODEL_VERSION", "vlm").strip() or "vlm"


def debug_engine_config() -> dict[str, object]:
    return {
        "provider": get_engine_provider(),
        "official_api_token_configured": bool(official_api_token()),
        "official_api_base_url": official_api_base_url(),
        "model_version": model_version(),
        "table_enabled": _env_bool("MINERU_ENABLE_TABLE", True),
        "formula_enabled": _env_bool("MINERU_ENABLE_FORMULA", True),
    }


def _sanitize_data_id(job_id: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9_.\-]", "_", job_id.strip())[:128]
    return s or "job"


def _json_snippet(obj: object, limit: int = 800) -> str:
    try:
        text = json.dumps(obj, ensure_ascii=False)[:limit]
    except Exception:
        text = str(obj)[:limit]
    return text


def _headers() -> dict[str, str]:
    token = official_api_token()
    return {
        "Content-Type": "application/json",
        "Accept": "*/*",
        "Authorization": f"Bearer {token}",
    }


async def _parse_json_response(resp: httpx.Response) -> Any:
    try:
        return resp.json()
    except Exception as e:
        text = (resp.text or "")[:800]
        raise MinerUOfficialApiError(
            f"invalid_json http={resp.status_code} body_snippet={text!r} err={type(e).__name__}"
        ) from e


async def run_official_api_extract(
    *,
    client: httpx.AsyncClient,
    signed_source_url: str,
    output_dir: Path,
    job_id: str,
) -> tuple[Path, int]:
    """
    Submit Precision Extract task with public file URL, poll until done, download zip, unzip.

    Returns (primary_markdown_path, total_pages best-effort).
    Raises MinerUOfficialApiError on failure.
    """
    base = official_api_base_url()
    token = official_api_token()
    if not token:
        raise MinerUOfficialApiError("MINERU_OFFICIAL_API_TOKEN is not set")

    mv = model_version()
    enable_table = _env_bool("MINERU_ENABLE_TABLE", True)
    enable_formula = _env_bool("MINERU_ENABLE_FORMULA", True)
    data_id = _sanitize_data_id(job_id)

    log.info(
        "[mineru-worker] official_api_start job_id=%s model_version=%s enable_table=%s enable_formula=%s",
        job_id,
        mv,
        enable_table,
        enable_formula,
    )

    submit_url = f"{base}/api/v4/extract/task"
    body: dict[str, object] = {
        "url": signed_source_url,
        "model_version": mv,
        "enable_table": enable_table,
        "enable_formula": enable_formula,
        "data_id": data_id,
    }

    log.info("[mineru-worker] official_api_submit_started job_id=%s endpoint=%s", job_id, submit_url)
    try:
        r = await client.post(submit_url, headers=_headers(), json=body)
    except httpx.RequestError as e:
        raise MinerUOfficialApiError(
            f"submit_request_error:{type(e).__name__}:{str(e)[:600]}"
        ) from e

    payload = await _parse_json_response(r)
    if r.status_code != 200:
        raise MinerUOfficialApiError(
            f"submit_http_{r.status_code} body_snippet={_json_snippet(payload)}"
        )

    code = payload.get("code")
    if code != 0:
        msg = payload.get("msg", "")
        raise MinerUOfficialApiError(
            f"submit_api_code={code} msg={str(msg)[:800]} trace={payload.get('trace_id', '')!s}"
        )

    data = payload.get("data") or {}
    task_id = data.get("task_id")
    if not task_id or not isinstance(task_id, str):
        raise MinerUOfficialApiError(f"submit_missing_task_id body_snippet={_json_snippet(payload)}")

    log.info("[mineru-worker] official_api_task_created job_id=%s task_id=%s", job_id, task_id)

    poll_url = f"{base}/api/v4/extract/task/{task_id}"
    max_wait = float(os.environ.get("MINERU_OFFICIAL_API_MAX_WAIT_SEC", "1800") or "1800")
    interval = float(os.environ.get("MINERU_OFFICIAL_API_POLL_INTERVAL_SEC", "2") or "2")
    elapsed = 0.0
    last_state: str | None = None
    total_pages = 0
    poll_idx = 0

    while elapsed < max_wait:
        poll_idx += 1

        try:
            pr = await client.get(poll_url, headers=_headers())
        except httpx.RequestError as e:
            raise MinerUOfficialApiError(
                f"poll_request_error task_id={task_id} {type(e).__name__}:{str(e)[:600]}"
            ) from e

        pjson = await _parse_json_response(pr)
        if pr.status_code != 200:
            raise MinerUOfficialApiError(
                f"poll_http_{pr.status_code} task_id={task_id} body_snippet={_json_snippet(pjson)}"
            )

        if pjson.get("code") != 0:
            msg = pjson.get("msg", "")
            raise MinerUOfficialApiError(
                f"poll_api_code={pjson.get('code')} task_id={task_id} msg={str(msg)[:800]} "
                f"trace={pjson.get('trace_id', '')!s}"
            )

        pdata = pjson.get("data") or {}
        state = str(pdata.get("state") or "")

        prog = pdata.get("extract_progress") or {}
        if isinstance(prog, dict):
            tp = prog.get("total_pages")
            if isinstance(tp, int) and tp > 0:
                total_pages = tp

        if state != last_state:
            log.info(
                "[mineru-worker] official_api_poll task_id=%s state=%s elapsed_sec=%.0f",
                task_id,
                state,
                elapsed,
            )
            last_state = state
        elif poll_idx % 15 == 0:
            log.info(
                "[mineru-worker] official_api_poll task_id=%s state=%s elapsed_sec=%.0f (ongoing)",
                task_id,
                state,
                elapsed,
            )

        if state == "done":
            zip_url = pdata.get("full_zip_url")
            if not zip_url or not isinstance(zip_url, str):
                raise MinerUOfficialApiError(
                    f"done_missing_full_zip_url task_id={task_id} body_snippet={_json_snippet(pdata)}"
                )

            if output_dir.exists():
                shutil.rmtree(output_dir)
            output_dir.mkdir(parents=True, exist_ok=True)

            zip_path = output_dir.parent / f"mineru_result_{task_id}.zip"
            log.info("[mineru-worker] official_api_result_download_started task_id=%s", task_id)
            try:
                async with client.stream(
                    "GET",
                    zip_url,
                    follow_redirects=True,
                    timeout=httpx.Timeout(600.0, connect=60.0),
                ) as zr:
                    if zr.status_code != 200:
                        zt = (await zr.aread())[:800]
                        raise MinerUOfficialApiError(
                            f"zip_download_http_{zr.status_code} task_id={task_id} body_snippet={zt!r}"
                        )
                    with zip_path.open("wb") as zf:
                        async for chunk in zr.aiter_bytes():
                            zf.write(chunk)
            except MinerUOfficialApiError:
                raise
            except httpx.RequestError as e:
                raise MinerUOfficialApiError(
                    f"zip_download_error task_id={task_id} {type(e).__name__}:{str(e)[:600]}"
                ) from e

            def _unzip() -> int:
                with zipfile.ZipFile(zip_path, "r") as zf:
                    zf.extractall(output_dir)
                n = sum(1 for p in output_dir.rglob("*") if p.is_file())
                return n

            file_count = await asyncio.to_thread(_unzip)
            try:
                zip_path.unlink(missing_ok=True)
            except OSError:
                pass

            log.info(
                "[mineru-worker] official_api_result_extracted task_id=%s files_under_output=%s",
                task_id,
                file_count,
            )

            md_path = pick_primary_markdown(output_dir)
            if md_path is None:
                raise MinerUOfficialApiError(
                    f"no_markdown_after_extract task_id={task_id} files={file_count}"
                )

            log.info(
                "[mineru-worker] official_api_primary_markdown path=%s size=%s",
                md_path.name,
                md_path.stat().st_size,
            )
            return md_path, total_pages

        if state == "failed":
            err = str(pdata.get("err_msg") or "")[:2000]
            raise MinerUOfficialApiError(f"task_failed task_id={task_id} err_msg={err!r}")

        if state not in ("pending", "running", "converting", ""):
            raise MinerUOfficialApiError(
                f"unknown_state task_id={task_id} state={state!r} body_snippet={_json_snippet(pdata)}"
            )

        await asyncio.sleep(interval)
        elapsed += interval

    raise MinerUOfficialApiError(
        f"poll_timeout task_id={task_id} waited_sec={int(max_wait)} last_state={last_state!r}"
    )
