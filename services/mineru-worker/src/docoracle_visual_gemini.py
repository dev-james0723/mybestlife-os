"""Optional Gemini multimodal enrichment for Doc Oracle visual assets (Railway worker)."""

from __future__ import annotations

import base64
import json
import logging
import os
import re
from pathlib import Path
from typing import Any

import httpx

log = logging.getLogger(__name__)

_GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


def _resize_to_jpeg(data: bytes, max_side: int = 1024) -> tuple[bytes, str] | None:
    try:
        from io import BytesIO

        from PIL import Image

        im = Image.open(BytesIO(data))
        im = im.convert("RGB")
        im.thumbnail((max_side, max_side))
        buf = BytesIO()
        im.save(buf, format="JPEG", quality=84, optimize=True)
        return buf.getvalue(), "image/jpeg"
    except Exception:
        return None


def _strip_json_fence(s: str) -> str:
    t = s.strip()
    if t.startswith("```"):
        t = re.sub(r"^```(?:json)?\s*", "", t, flags=re.IGNORECASE)
        t = re.sub(r"\s*```$", "", t)
    return t.strip()


def enrich_visual_rows_with_gemini(
    visual_rows: list[dict[str, Any]],
    *,
    output_dir: Path,
    document_language: str | None,
    document_title: str,
) -> None:
    """
    Mutates visual_rows in place when GEMINI_API_KEY is set. Never raises to callers.
    """
    api_key = (os.environ.get("GEMINI_API_KEY") or "").strip()
    if not api_key:
        return
    try:
        limit = int(os.environ.get("DOCORACLE_VISUAL_GEMINI_LIMIT", "40"))
    except ValueError:
        limit = 40
    limit = max(0, min(limit, 120))
    if limit == 0:
        return

    model = (os.environ.get("DOCORACLE_VISUAL_GEMINI_MODEL") or "gemini-2.0-flash").strip()
    lang_hint = document_language or "auto"
    url = _GEMINI_URL.format(model=model)

    processed = 0
    for row in visual_rows:
        if processed >= limit:
            break
        rel_storage = row.get("image_path")
        if not isinstance(rel_storage, str) or not rel_storage.strip():
            continue
        rel = rel_storage.split("mineru/raw/", 1)[-1].lstrip("/")
        local = output_dir / rel
        if not local.is_file():
            continue
        try:
            raw_bytes = local.read_bytes()
        except OSError:
            continue
        if len(raw_bytes) > 12_000_000:
            continue

        img_part: tuple[bytes, str]
        resized = _resize_to_jpeg(raw_bytes)
        img_part = resized if resized else (raw_bytes, "image/png")

        b64 = base64.standard_b64encode(img_part[0]).decode("ascii")
        prompt = f"""You analyze one image from a PDF document.
Document title: {document_title[:400]}
Detected document language hint: {lang_hint}
MinerU type hint: {row.get("type")!r}

Return STRICT JSON only (no markdown) with keys:
title, description, semantic_category, extracted_labels, retrieval_tags, related_terms, confidence

semantic_category must be one of:
table|diagram|screenshot|poster|logo|text_snapshot|chart|formula|photo|figure|unknown

Rules:
- title: short human title; NEVER use hash-like filenames as title.
- description: 2-4 sentences, document language when possible (Traditional Chinese for zh-TW style content).
- extracted_labels: short visible labels/text in the image.
- retrieval_tags: 6-12 keywords for search.
- related_terms: optional proper nouns.
- confidence: 0.0-1.0 for your interpretation.

JSON:"""

        body: dict[str, Any] = {
            "contents": [
                {
                    "parts": [
                        {"inline_data": {"mime_type": img_part[1], "data": b64}},
                        {"text": prompt},
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json",
            },
        }

        try:
            with httpx.Client(timeout=120.0) as client:
                r = client.post(f"{url}?key={api_key}", json=body)
            if r.status_code != 200:
                log.warning(
                    "[mineru-worker] visual_gemini_http status=%s body=%s",
                    r.status_code,
                    r.text[:200],
                )
                continue
            data = r.json()
            parts = (
                data.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [])
            )
            txt = ""
            for p in parts:
                if isinstance(p, dict) and isinstance(p.get("text"), str):
                    txt += p["text"]
            if not txt.strip():
                continue
            parsed = json.loads(_strip_json_fence(txt))
        except Exception as e:
            log.warning("[mineru-worker] visual_gemini_parse_failed: %s", str(e)[:200])
            continue

        title = parsed.get("title")
        desc = parsed.get("description")
        sem = parsed.get("semantic_category")
        labels = parsed.get("extracted_labels")
        tags = parsed.get("retrieval_tags")
        rel_terms = parsed.get("related_terms")
        conf = parsed.get("confidence")

        if isinstance(title, str) and title.strip():
            row["title"] = title.strip()[:200]
        if isinstance(desc, str) and desc.strip():
            row["description"] = desc.strip()[:4000]
        if isinstance(sem, str) and sem.strip():
            row["semantic_category"] = sem.strip()[:64]

        def _list_str(v: Any, cap: int) -> list[str]:
            if not isinstance(v, list):
                return []
            out: list[str] = []
            for x in v[:cap]:
                if isinstance(x, str) and x.strip():
                    out.append(x.strip()[:200])
            return out

        row["extracted_labels"] = _list_str(labels, 24) or row.get("extracted_labels") or []
        row["retrieval_tags"] = _list_str(tags, 24) or row.get("retrieval_tags") or []
        row["related_terms"] = _list_str(rel_terms, 24)

        if isinstance(conf, (int, float)) and 0 <= float(conf) <= 1:
            row["confidence"] = float(conf)
        else:
            row["confidence"] = max(float(row.get("confidence") or 0.2), 0.55)

        processed += 1

    if processed:
        log.info("[mineru-worker] visual_gemini_enriched count=%s model=%s", processed, model)
