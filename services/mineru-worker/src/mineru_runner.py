"""MinerU CLI integration for Doc Oracle (pipeline backend)."""

from __future__ import annotations

import logging
import os
import shutil
import subprocess
from pathlib import Path

log = logging.getLogger(__name__)


class MinerUCliError(Exception):
    """Raised when the MinerU CLI is missing or exits with an error."""


def assert_mineru_cli_available() -> None:
    if not shutil.which("mineru"):
        raise MinerUCliError("MinerU CLI is not installed in this worker image.")


def run_mineru_cli(
    *,
    input_pdf: Path,
    output_dir: Path,
    backend: str,
    timeout_sec: int,
) -> None:
    """
    Run: mineru [--api-url URL] -p <input> -o <output> -b <backend>
    Raises MinerUCliError on failure.
    """
    assert_mineru_cli_available()
    output_dir.mkdir(parents=True, exist_ok=True)
    internal_api_url = os.environ.get("MINERU_INTERNAL_API_URL", "").strip()

    cmd = ["mineru"]

    if internal_api_url:
        cmd.extend(["--api-url", internal_api_url])

    cmd.extend(
        [
            "-p",
            str(input_pdf),
            "-o",
            str(output_dir),
            "-b",
            backend,
        ]
    )
    log.info(
        "[mineru-worker] mineru_spawn backend=%s timeout_sec=%s input=%s api_url_configured=%s",
        backend,
        timeout_sec,
        input_pdf.name,
        bool(internal_api_url),
    )
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout_sec,
            check=False,
        )
    except subprocess.TimeoutExpired as e:
        raise MinerUCliError(
            f"MinerU subprocess timed out after {timeout_sec}s",
        ) from e
    except OSError as e:
        raise MinerUCliError(f"MinerU failed to start: {type(e).__name__}: {e}") from e

    if proc.returncode != 0:
        stdout_tail = (proc.stdout or "").strip()[-4000:]
        stderr_tail = (proc.stderr or "").strip()[-4000:]

        log.error(
            "[mineru-worker] mineru_nonzero_exit code=%s stdout_tail=%s stderr_tail=%s",
            proc.returncode,
            stdout_tail[:1000],
            stderr_tail[:1000],
        )

        raise MinerUCliError(
            "MinerU exited with code "
            f"{proc.returncode}. stdout_tail={stdout_tail[:2000]} stderr_tail={stderr_tail[:2000]}"
        )

    log.info("[mineru-worker] mineru_ok returncode=0")


def pick_primary_markdown(output_dir: Path) -> Path | None:
    """Choose a representative markdown file from MinerU output (largest .md)."""
    if not output_dir.exists():
        return None
    mds = [p for p in output_dir.rglob("*.md") if p.is_file() and not p.name.startswith(".")]
    if not mds:
        return None
    return max(mds, key=lambda p: p.stat().st_size)
