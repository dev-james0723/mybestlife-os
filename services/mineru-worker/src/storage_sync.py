"""Upload MinerU output tree into Supabase Storage `knowledge-files` bucket."""

from __future__ import annotations

import logging
import mimetypes
from pathlib import Path

from supabase import Client, create_client

log = logging.getLogger(__name__)

_BUCKET = "knowledge-files"


def _guess_content_type(path: Path) -> str:
    ct, _ = mimetypes.guess_type(str(path))
    return ct or "application/octet-stream"


def get_supabase_client() -> Client:
    import os

    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for storage upload")
    return create_client(url, key)


def upload_tree_under_prefix(
    *,
    client: Client,
    local_root: Path,
    storage_prefix: str,
) -> int:
    """
    Upload every file under local_root to `{storage_prefix}/{relative_path}`.
    Returns number of files uploaded.
    """
    prefix = storage_prefix.strip().strip("/")
    count = 0
    for p in sorted(local_root.rglob("*")):
        if not p.is_file():
            continue
        if p.name.startswith("."):
            continue
        rel = p.relative_to(local_root).as_posix()
        dest = f"{prefix}/{rel}" if prefix else rel
        data = p.read_bytes()
        ct = _guess_content_type(p)
        try:
            client.storage.from_(_BUCKET).upload(
                dest,
                data,
                {"content-type": ct, "upsert": "true"},
            )
            count += 1
        except Exception as e:
            log.exception("[mineru-worker] storage_upload_failed path=%s", dest[:200])
            raise RuntimeError(f"storage_upload_failed:{dest[:120]}:{type(e).__name__}") from e
    log.info("[mineru-worker] storage_upload_done files=%s prefix_tail=%s", count, prefix[-80:])
    return count


def upload_storage_object(
    *,
    client: Client,
    storage_path: str,
    data: bytes,
    content_type: str,
) -> None:
    """Upload a single object (e.g. manifest.json) with upsert."""
    dest = storage_path.strip().strip("/")
    client.storage.from_(_BUCKET).upload(
        dest,
        data,
        {"content-type": content_type, "upsert": "true"},
    )
