"""Download signed PDF input into the job workspace (never log full signed URLs)."""

from __future__ import annotations

import logging
from pathlib import Path

import httpx

log = logging.getLogger(__name__)

_ALLOWED_CT = frozenset(
    {
        "application/pdf",
        "application/octet-stream",
        "binary/octet-stream",
        "application/x-pdf",
    }
)


async def download_signed_pdf(
    *,
    signed_input_url: str,
    dest: Path,
    timeout_sec: float = 120.0,
) -> None:
    """
    Download PDF bytes to dest. Raises DownloadError on failure.
    Uses follow_redirects=True so intermediate 302/307 from storage do not confuse callers.
    """
    dest.parent.mkdir(parents=True, exist_ok=True)
    async with httpx.AsyncClient(timeout=timeout_sec, follow_redirects=True) as client:
        try:
            async with client.stream("GET", signed_input_url) as resp:
                status = resp.status_code
                if status != 200:
                    raise DownloadError(f"HTTP {status}", status)
                ct = (resp.headers.get("content-type") or "").split(";")[0].strip().lower()
                if ct and ct not in _ALLOWED_CT and not ct.startswith("application/"):
                    log.warning(
                        "[mineru-worker] unexpected_content_type job_download content_type=%s",
                        ct[:80],
                    )
                total = 0
                with dest.open("wb") as out:
                    async for chunk in resp.aiter_bytes():
                        total += len(chunk)
                        out.write(chunk)
                if total == 0:
                    raise DownloadError("empty_body", status)
        except httpx.RequestError as e:
            raise DownloadError(
                f"request_error:{type(e).__name__}:{str(e)[:400]}",
                None,
            ) from e


class DownloadError(Exception):
    def __init__(self, message: str, http_status: int | None) -> None:
        super().__init__(message)
        self.http_status = http_status
