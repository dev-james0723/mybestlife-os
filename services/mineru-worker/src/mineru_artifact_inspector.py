"""Scan MinerU output directory and build a portable manifest (paths only, no huge logs)."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)

_IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
_TABLE_EXT = {".csv", ".xlsx", ".html"}
_FORMULA_EXT = {".tex", ".mml", ".latex"}


def _rel(p: Path, root: Path) -> str:
    return p.relative_to(root).as_posix()


def inspect_mineru_output(output_dir: Path) -> dict[str, Any]:
    """
    Recursively classify files under output_dir.
    Does not assume a fixed MinerU folder layout.
    """
    warnings: list[str] = []
    if not output_dir.exists():
        warnings.append("output_dir_missing")
        return _empty_manifest(warnings)

    all_files: list[str] = []
    md_files: list[Path] = []
    html_files: list[Path] = []
    json_files: list[Path] = []
    image_files: list[Path] = []
    table_files: list[Path] = []
    formula_files: list[Path] = []
    layout_json: list[Path] = []
    middle_json: list[Path] = []
    content_list_json: list[Path] = []

    for p in sorted(output_dir.rglob("*")):
        if not p.is_file() or p.name.startswith("."):
            continue
        rel = _rel(p, output_dir)
        all_files.append(rel)
        suf = p.suffix.lower()
        if suf == ".md":
            md_files.append(p)
        elif suf == ".html":
            html_files.append(p)
        elif suf == ".json":
            json_files.append(p)
            name_l = p.name.lower()
            if "layout" in name_l:
                layout_json.append(p)
            if "middle" in name_l:
                middle_json.append(p)
            if "content_list" in name_l:
                content_list_json.append(p)
        elif suf in _IMAGE_EXT:
            image_files.append(p)
        elif suf in _TABLE_EXT or ("table" in p.name.lower() and suf in {".html", ".csv", ".xlsx"}):
            table_files.append(p)
        elif suf in _FORMULA_EXT or "formula" in p.name.lower():
            formula_files.append(p)

    primary_md: Path | None = None
    if md_files:
        primary_md = max(md_files, key=lambda x: x.stat().st_size)

    primary_html: Path | None = None
    if html_files:
        primary_html = max(html_files, key=lambda x: x.stat().st_size)

    est_pages = _estimate_pages(
        primary_md=primary_md,
        content_list_paths=content_list_json,
        layout_paths=layout_json,
        middle_paths=middle_json,
    )
    if est_pages <= 0:
        est_pages = 1
        warnings.append("estimated_pages_fallback_1")

    manifest: dict[str, Any] = {
        "primary_markdown_path": _rel(primary_md, output_dir) if primary_md else "",
        "primary_html_path": _rel(primary_html, output_dir) if primary_html else "",
        "json_files": [_rel(p, output_dir) for p in json_files],
        "layout_json_files": [_rel(p, output_dir) for p in layout_json],
        "middle_json_files": [_rel(p, output_dir) for p in middle_json],
        "content_list_json_files": [_rel(p, output_dir) for p in content_list_json],
        "image_files": [_rel(p, output_dir) for p in image_files],
        "table_files": [_rel(p, output_dir) for p in table_files],
        "formula_files": [_rel(p, output_dir) for p in formula_files],
        "all_files": all_files,
        "estimated_total_pages": est_pages,
        "warnings": warnings,
    }

    log.info(
        "[mineru-worker] artifact_manifest primary_md=%s json=%s images=%s est_pages=%s warns=%s",
        manifest["primary_markdown_path"] or "(none)",
        len(json_files),
        len(image_files),
        est_pages,
        len(warnings),
    )
    return manifest


def _empty_manifest(warnings: list[str]) -> dict[str, Any]:
    return {
        "primary_markdown_path": "",
        "primary_html_path": "",
        "json_files": [],
        "layout_json_files": [],
        "middle_json_files": [],
        "content_list_json_files": [],
        "image_files": [],
        "table_files": [],
        "formula_files": [],
        "all_files": [],
        "estimated_total_pages": 0,
        "warnings": warnings,
    }


def _estimate_pages(
    *,
    primary_md: Path | None,
    content_list_paths: list[Path],
    layout_paths: list[Path],
    middle_paths: list[Path],
) -> int:
    for plist in (content_list_paths, layout_paths, middle_paths):
        for p in plist:
            try:
                data = json.loads(p.read_text(encoding="utf-8", errors="replace"))
            except Exception:
                continue
            n = _page_count_from_json(data)
            if n > 0:
                return n
    if primary_md and primary_md.exists():
        text = primary_md.read_text(encoding="utf-8", errors="replace")
        markers = text.count("\n---\n") + text.count("\n***\n")
        if markers > 2:
            return min(max(markers + 1, 1), 500)
        # rough chars-per-page heuristic
        approx = max(1, len(text) // 3500)
        return min(approx, 500)
    return 0


def _page_count_from_json(data: Any) -> int:
    best = 0
    if isinstance(data, list):
        for item in data:
            if not isinstance(item, dict):
                continue
            for key in ("page_idx", "page_index", "page", "page_number", "page_id"):
                v = item.get(key)
                if isinstance(v, int) and v >= 0:
                    best = max(best, v + 1)
        return best
    if isinstance(data, dict):
        for key in ("pdf_info", "info", "meta"):
            sub = data.get(key)
            if isinstance(sub, dict):
                tp = sub.get("total_page") or sub.get("total_pages") or sub.get("page_count")
                if isinstance(tp, int) and tp > 0:
                    return min(tp, 500)
        pages = data.get("pages") or data.get("page_list")
        if isinstance(pages, list) and len(pages) > 0:
            return min(len(pages), 500)
        # recurse shallow
        for v in data.values():
            if isinstance(v, (list, dict)):
                inner = _page_count_from_json(v)
                best = max(best, inner)
    return best
