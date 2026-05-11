"""Infer document type from storage path / filename (parser adapters hook)."""

from __future__ import annotations

from pathlib import PurePosixPath


def infer_document_type(*, input_storage_path: str, mime_hint: str | None = None) -> str:
    p = input_storage_path.strip().lower()
    suf = PurePosixPath(p).suffix
    if mime_hint:
        m = mime_hint.lower()
        if "pdf" in m:
            return "pdf"
        if "word" in m or "officedocument.wordprocessingml" in m:
            return "docx"
        if "presentation" in m or "powerpoint" in m:
            return "pptx"
        if "spreadsheet" in m or "excel" in m:
            return "xlsx"
        if "csv" in m:
            return "csv"
        if m.startswith("image/"):
            return "image"
    ext_map = {
        ".pdf": "pdf",
        ".doc": "doc",
        ".docx": "docx",
        ".ppt": "ppt",
        ".pptx": "pptx",
        ".xls": "xls",
        ".xlsx": "xlsx",
        ".csv": "csv",
        ".png": "image",
        ".jpg": "image",
        ".jpeg": "image",
        ".webp": "image",
        ".gif": "image",
    }
    return ext_map.get(suf, "document")
