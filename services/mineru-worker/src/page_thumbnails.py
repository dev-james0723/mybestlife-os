"""Full-page PDF thumbnails (PyMuPDF) for Doc Oracle — files live under output_dir before storage upload."""

from __future__ import annotations

import logging
from pathlib import Path

log = logging.getLogger(__name__)


def render_pdf_page_thumbnails(
    *,
    source_pdf_path: Path | None,
    output_dir: Path,
    limit: int,
) -> dict[int, str]:
    """
    Render full-page PDF thumbnails using PyMuPDF.

    Returns:
        {1: "page-thumbnails/page-001.png", 2: "page-thumbnails/page-002.png", ...}
        Paths are relative to output_dir (uploaded with the MinerU output tree).
    """
    if source_pdf_path is None or not source_pdf_path.is_file():
        return {}

    try:
        import fitz  # PyMuPDF
    except Exception as e:
        log.warning("[mineru-worker] pymupdf_unavailable error=%s", str(e)[:300])
        return {}

    out: dict[int, str] = {}
    thumb_dir = output_dir / "page-thumbnails"
    try:
        thumb_dir.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        log.warning("[mineru-worker] page_thumbnails_mkdir_failed error=%s", str(e)[:300])
        return {}

    try:
        doc = fitz.open(source_pdf_path)
    except Exception as e:
        log.warning("[mineru-worker] pdf_open_for_thumbnails_failed error=%s", str(e)[:300])
        return {}

    try:
        cap = max(0, int(limit))
        total = min(len(doc), cap)
        zoom = 1.35
        matrix = fitz.Matrix(zoom, zoom)

        for idx in range(total):
            page_number = idx + 1
            try:
                page = doc.load_page(idx)
                pix = page.get_pixmap(matrix=matrix, alpha=False)
                rel = f"page-thumbnails/page-{page_number:03d}.png"
                dest = output_dir / rel
                pix.save(str(dest))
                out[page_number] = rel
            except Exception as e:
                log.warning(
                    "[mineru-worker] page_thumbnail_failed page=%s error=%s",
                    page_number,
                    str(e)[:240],
                )
                continue
    finally:
        doc.close()

    log.info(
        "[mineru-worker] page_thumbnails_rendered count=%s source=%s",
        len(out),
        source_pdf_path.name,
    )
    return out
