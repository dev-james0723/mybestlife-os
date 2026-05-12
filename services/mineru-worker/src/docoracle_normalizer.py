"""Materialize MinerU artifacts into Doc Oracle Supabase tables (service role)."""

from __future__ import annotations

import json
import logging
import re
import uuid
from collections import Counter
from pathlib import Path
from typing import Any

from bs4 import BeautifulSoup
from markdownify import markdownify as html_to_md
from supabase import Client

from .document_format import infer_document_type

log = logging.getLogger(__name__)

_STOP_EN = {
    "the",
    "and",
    "for",
    "that",
    "this",
    "with",
    "from",
    "have",
    "has",
    "are",
    "was",
    "were",
    "been",
    "will",
    "your",
    "you",
    "our",
    "their",
    "not",
    "but",
    "can",
    "may",
    "into",
    "about",
    "than",
    "then",
    "also",
    "such",
    "each",
    "all",
    "any",
    "its",
    "one",
    "two",
    "per",
    "via",
}


def _new_id() -> str:
    return str(uuid.uuid4())


def clean_mineru_markdown(raw: str) -> str:
    """
    Strip unsafe tags, convert embedded HTML tables to Markdown where possible,
    remove stray table cell markup from appearing as raw tags in previews.
    """
    if not raw or not raw.strip():
        return ""

    s = raw

    def _table_repl(match: re.Match[str]) -> str:
        frag = match.group(0)
        try:
            soup = BeautifulSoup(frag, "html.parser")
            for bad in soup(["script", "style", "iframe"]):
                bad.decompose()
            t = soup.find("table")
            if not t:
                return "\n\n"
            md = html_to_md(
                str(t),
                heading_style="ATX",
                strip=["script", "style", "iframe"],
                bullets="-",
            ).strip()
            return f"\n\n{md}\n\n" if md else "\n\n"
        except Exception:
            return "\n\n"

    s = re.sub(r"<table\b[^>]*>.*?</table>", _table_repl, s, flags=re.IGNORECASE | re.DOTALL)

    # Strip common leftover table fragments MinerU sometimes leaks into markdown.
    s = re.sub(r"</?(?:td|tr|th|tbody|thead|tfoot|caption)\b[^>]*>", "\n", s, flags=re.IGNORECASE)
    s = re.sub(r"</?table\b[^>]*>", "\n", s, flags=re.IGNORECASE)

    if "<" in s and ">" in s:
        try:
            soup = BeautifulSoup(s, "html.parser")
            for bad in soup(["script", "style", "iframe"]):
                bad.decompose()
            plain = soup.get_text("\n")
            tag_count = len(re.findall(r"<[a-zA-Z][^>]{0,60}>", s))
            if tag_count > 6 or re.search(r"<div\b|<span\b|<p\b", s, re.I):
                s2 = html_to_md(str(soup), heading_style="ATX", strip=["script", "style", "iframe"])
                s = s2.strip() if s2.strip() else plain
            else:
                s = plain
        except Exception:
            s = re.sub(r"<[^>]+>", "", s)

    s = re.sub(r"\n{3,}", "\n\n", s).strip()
    return s


def rewrite_mineru_image_paths(md: str, *, primary_rel: str, output_base_path: str) -> str:
    """Turn relative MinerU image paths into knowledge-files storage paths (bucket root relative)."""
    parent = Path(primary_rel).parent.as_posix().strip(".")
    prefix = output_base_path.rstrip("/") + "/mineru/raw"

    def repl(m: re.Match[str]) -> str:
        alt = m.group(1)
        path = m.group(2).strip().strip('"').strip("'")
        if path.startswith("http") or path.startswith("data:") or path.startswith("/api/"):
            return m.group(0)
        rel = path.lstrip("/")
        if parent and parent != ".":
            full_rel = f"{parent}/{rel}".replace("//", "/")
        else:
            full_rel = rel
        storage = f"{prefix}/{full_rel}"
        return f"![{alt}]({storage})"

    return re.sub(r"!\[([^\]]*)\]\(([^)]+)\)", repl, md)


def _read_json(path: Path) -> Any | None:
    try:
        return json.loads(path.read_text(encoding="utf-8", errors="replace"))
    except Exception as e:
        log.warning(
            "[mineru-worker] read_json_failed path=%s error=%s",
            path.name,
            str(e)[:300],
        )
        return None


def _try_content_list(output_dir: Path, rel_paths: list[str]) -> list[dict[str, Any]] | None:
    for rel in rel_paths:
        if "content_list" not in rel.lower():
            continue
        p = output_dir / rel
        if not p.is_file():
            continue

        data = _read_json(p)
        if data is None:
            continue

        if isinstance(data, list):
            items = data
        elif isinstance(data, dict):
            items = None
            for key in ("content", "items", "data", "pages"):
                val = data.get(key)
                if isinstance(val, list):
                    items = val
                    break
            if items is None:
                continue
        else:
            continue

        rows = [x for x in items if isinstance(x, dict)]
        if rows:
            return rows

    return None


def _guess_lang(text: str) -> str | None:
    if re.search(r"[\u4e00-\u9fff]", text[:2000]):
        if re.search(r"(?i)\b(the|and|for|with)\b", text[:2000]):
            return "mixed"
        return "zh"
    if re.search(r"(?i)\b(the|and|for|with)\b", text[:2000]):
        return "en"
    return None


def _split_paragraphs(md: str) -> list[str]:
    parts = re.split(r"\n{2,}", md.strip())
    return [p.strip() for p in parts if p.strip()]


def _char_len(s: str) -> int:
    return len(s)


def _chunk_text(md: str, target_min: int = 500, target_max: int = 1200) -> list[str]:
    paras = _split_paragraphs(md)
    chunks: list[str] = []
    buf = ""
    for p in paras:
        if not buf:
            buf = p
            continue
        candidate = f"{buf}\n\n{p}"
        if _char_len(candidate) <= target_max:
            buf = candidate
            continue
        if _char_len(buf) >= target_min:
            chunks.append(buf)
            buf = p
        else:
            buf = candidate
    if buf.strip():
        chunks.append(buf.strip())
    # hard-split oversized
    out: list[str] = []
    for c in chunks:
        if _char_len(c) <= target_max * 2:
            out.append(c)
            continue
        start = 0
        while start < len(c):
            out.append(c[start : start + target_max])
            start += target_max
    return out


def _heading_lines(md: str) -> list[tuple[int, str, int]]:
    """Return (level, title, line_index)."""
    out: list[tuple[int, str, int]] = []
    for i, line in enumerate(md.splitlines()):
        m = re.match(r"^(#{1,6})\s+(.+?)\s*$", line.strip())
        if m:
            level = len(m.group(1))
            title = m.group(2).strip()
            if title:
                out.append((level, title, i))
            continue
        # Chinese-style numbered headings
        m2 = re.match(r"^(\d+(?:\.\d+)*)\s+(.+)$", line.strip())
        if m2 and len(m2.group(2)) < 120:
            out.append((2, m2.group(0).strip(), i))
    return out


def _extract_bold_terms(md: str, limit: int = 80) -> list[str]:
    found = re.findall(r"\*\*([^*]+)\*\*", md)
    out: list[str] = []
    for t in found:
        t = t.strip()
        if 2 <= len(t) <= 80 and t not in out:
            out.append(t)
        if len(out) >= limit:
            break
    return out


def _keywords_from_text(text: str, limit: int = 12) -> list[str]:
    tokens = re.findall(r"[\u4e00-\u9fff]{2,4}|[A-Za-z][A-Za-z0-9\-]{2,}", text.lower())
    c = Counter()
    for t in tokens:
        if t in _STOP_EN or t.isdigit():
            continue
        c[t] += 1
    return [w for w, _ in c.most_common(limit)]


def _build_executive_summary(
    *,
    title: str,
    doc_type: str,
    total_pages: int,
    cleaned_md: str,
    headings: list[tuple[int, str, int]],
    lang: str | None,
) -> str:
    lines: list[str] = []
    lines.append(f"**{title}**")
    lines.append("")
    lines.append(
        f"- Parser: MinerU · Pages: {total_pages} · Type: {doc_type}"
        + (f" · Language: {lang}" if lang else "")
    )
    lines.append("")
    top_heads = [h[1] for h in headings[:8]]
    if top_heads:
        lines.append("**Outline preview**")
        for h in top_heads:
            lines.append(f"- {h}")
        lines.append("")
    excerpt = cleaned_md.strip()
    excerpt = re.sub(r"#{1,6}\s+", "", excerpt)
    excerpt = excerpt.replace("\n", " ").strip()
    if len(excerpt) > 520:
        excerpt = excerpt[:520] + "…"
    if excerpt:
        lines.append("**Excerpt**")
        lines.append(excerpt)
    return "\n".join(lines).strip()


def _suggested_questions(headings: list[str], lang_zh: bool) -> list[str]:
    base_en = [
        "What is this document mainly about?",
        "Summarize the key requirements.",
        "What are the important dates, fees, or action items?",
    ]
    base_zh = [
        "這份文件主要在說什麼？",
        "請整理關鍵要求與重點條款。",
        "有哪些重要日期、費用或待辦事項？",
    ]
    out = base_zh if lang_zh else base_en
    for h in headings[:4]:
        if len(h) > 80:
            continue
        if lang_zh:
            out.append(f"「{h}」這一節的重點是什麼？")
        else:
            out.append(f"What does the section “{h}” cover?")
    return out[:10]


def _visual_type_from_name(name: str) -> str:
    n = name.lower()
    if "table" in n:
        return "table"
    if "formula" in n or "eq" in n:
        return "formula"
    if "chart" in n or "graph" in n:
        return "chart"
    if "figure" in n or "fig" in n:
        return "figure"
    if "diagram" in n:
        return "diagram"
    return "image"


def _page_for_char_offset(md: str, offset: int, page_boundaries: list[int]) -> int | None:
    """page_boundaries: cumulative char lengths per page end; return 1-based page."""
    if not page_boundaries:
        return None
    acc = 0
    for i, end in enumerate(page_boundaries):
        acc += end
        if offset <= acc:
            return i + 1
    return len(page_boundaries)


def _page_for_ratio(char_offset: int, total_chars: int, total_pages: int) -> int | None:
    """
    Estimate a 1-based page number from a character offset when exact page boundaries
    are unavailable. Used as a fallback for sections/chunks.
    """
    if total_pages <= 0:
        return None

    if total_chars <= 0:
        return 1

    safe_offset = max(0, min(char_offset, total_chars))
    ratio = safe_offset / max(total_chars, 1)

    # Keep final offset inside last page, not page total_pages + 1.
    page = int(ratio * total_pages) + 1
    return max(1, min(total_pages, page))


class DocOracleNormalizationError(Exception):
    pass


def normalize_doc_oracle(
    *,
    client: Client,
    user_id: str,
    document_id: str,
    output_base_path: str,
    output_dir: Path,
    manifest: dict[str, Any],
    parser_version: str,
    document_title: str,
    input_storage_path: str,
    total_pages_hint: int,
) -> dict[str, Any]:
    """
    Upsert document_analyses and populate pages, sections, chunks, visuals, glossary.
    Returns stats dict for logging. Raises DocOracleNormalizationError if unusable.
    """
    primary_rel = str(manifest.get("primary_markdown_path") or "").strip()
    if not primary_rel:
        raise DocOracleNormalizationError("no_primary_markdown_in_manifest")
    md_path = output_dir / primary_rel
    if not md_path.is_file():
        raise DocOracleNormalizationError(f"primary_markdown_missing:{primary_rel}")

    raw_md = md_path.read_text(encoding="utf-8", errors="replace")
    cleaned = clean_mineru_markdown(raw_md)
    cleaned = rewrite_mineru_image_paths(cleaned, primary_rel=primary_rel, output_base_path=output_base_path)
    if not cleaned.strip():
        raise DocOracleNormalizationError("cleaned_markdown_empty")

    doc_type = infer_document_type(input_storage_path=input_storage_path)
    lang = _guess_lang(cleaned)
    lang_zh = lang in ("zh", "mixed")

    content_list = _try_content_list(
        output_dir, [str(x) for x in (manifest.get("content_list_json_files") or [])]
    )

    est = int(manifest.get("estimated_total_pages") or 0)
    total_pages = total_pages_hint if total_pages_hint > 0 else est
    if total_pages <= 0:
        total_pages = 1

    pages_payload: list[dict[str, Any]] = []
    page_boundaries: list[int] = []  # char lengths per page in order

    if content_list:
        by_page: dict[int, list[str]] = {}
        for item in content_list:
            pidx = item.get("page_idx")
            if not isinstance(pidx, int):
                pidx = item.get("page_index")
            if not isinstance(pidx, int):
                continue
            t = item.get("type")
            text = item.get("text")
            if isinstance(text, str) and text.strip():
                by_page.setdefault(pidx, []).append(text.strip())
            elif t == "image" and isinstance(item.get("img_path"), str):
                cap = item.get("image_caption") or item.get("caption")
                cap_s = cap.strip() if isinstance(cap, str) else ""
                img = str(item.get("img_path"))
                line = f"![{cap_s}]({img})" if cap_s else f"![]({img})"
                by_page.setdefault(pidx, []).append(line)
        if by_page:
            max_p = max(by_page.keys()) + 1
            total_pages = max(total_pages, max_p)
            for pn in range(max_p):
                chunk = "\n\n".join(by_page.get(pn, []))
                c2 = clean_mineru_markdown(chunk) if chunk else ""
                page_boundaries.append(_char_len(c2))
                pages_payload.append(
                    {
                        "page_number": pn + 1,
                        "markdown": c2 or "",
                        "raw_text": c2.replace("#", "").strip(),
                        "page_summary": (c2[:240] + "…") if len(c2) > 240 else c2,
                        "keywords": _keywords_from_text(c2),
                        "has_visual_assets": bool(
                            re.search(r"!\[[^\]]*\]\([^)]+\)", c2) or "<img" in chunk.lower()
                        ),
                    }
                )

    if not pages_payload:
        # Split cleaned markdown into pages by character budget
        n = max(1, min(total_pages, 200))
        L = len(cleaned)
        if L == 0:
            slice_size = 1
        else:
            slice_size = max(800, (L + n - 1) // n)
        start = 0
        pn = 0
        while start < L or pn == 0:
            pn += 1
            end = min(L, start + slice_size)
            chunk = cleaned[start:end].strip()
            if not chunk and start >= L:
                break
            page_boundaries.append(_char_len(chunk))
            pages_payload.append(
                {
                    "page_number": pn,
                    "markdown": chunk,
                    "raw_text": re.sub(r"#{1,6}\s+", "", chunk).strip(),
                    "page_summary": (chunk[:240] + "…") if len(chunk) > 240 else chunk,
                    "keywords": _keywords_from_text(chunk),
                    "has_visual_assets": bool(re.search(r"!\[[^\]]*\]\([^)]+\)", chunk)),
                }
            )
            start = end
            if pn > 500:
                break
        total_pages = len(pages_payload)

    headings = _heading_lines(cleaned)
    exec_summary = _build_executive_summary(
        title=document_title,
        doc_type=doc_type,
        total_pages=total_pages,
        cleaned_md=cleaned,
        headings=headings,
        lang=lang,
    )
    kb_raw = cleaned[:100_000]

    # --- DB: resolve analysis id, wipe children, upsert root ---
    prefix = output_base_path.rstrip("/")
    storage_raw_prefix = f"{prefix}/mineru/raw"

    ar = (
        client.table("document_analyses")
        .select("id")
        .eq("document_id", document_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    analysis_id: str
    now_iso = __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()

    root_row = {
        "user_id": user_id,
        "document_id": document_id,
        "parser": "mineru",
        "parser_version": parser_version,
        "document_title": document_title,
        "document_type": doc_type,
        "language": lang,
        "total_pages": total_pages,
        "summary": exec_summary[:50_000],
        "status": "completed",
        "visual_density": None,
        "extraction_risk": None,
        "updated_at": now_iso,
    }

    if ar.data and len(ar.data) > 0:
        analysis_id = str(ar.data[0]["id"])
        for tbl in (
            "document_chunks",
            "document_sections",
            "document_pages",
            "document_visual_assets",
            "document_glossary_terms",
        ):
            client.table(tbl).delete().eq("analysis_id", analysis_id).execute()
        client.table("document_analyses").update(root_row).eq("id", analysis_id).execute()
    else:
        root_row["created_at"] = now_iso
        ins = client.table("document_analyses").insert(root_row).execute()
        if not ins.data:
            raise DocOracleNormalizationError("analysis_insert_failed")
        analysis_id = str(ins.data[0]["id"])

    # --- pages ---
    sug_global = _suggested_questions([h[1] for h in headings], lang_zh)
    page_rows: list[dict[str, Any]] = []
    for p in pages_payload:
        pn = int(p["page_number"])
        page_rows.append(
            {
                "id": _new_id(),
                "user_id": user_id,
                "document_id": document_id,
                "analysis_id": analysis_id,
                "page_number": pn,
                "page_label": str(pn),
                "page_type": "content",
                "raw_text": p.get("raw_text") or "",
                "markdown": p.get("markdown") or "",
                "page_summary": p.get("page_summary") or "",
                "interpreted_page_meaning": None,
                "keywords": p.get("keywords") or [],
                "linked_terms": [],
                "linked_sections": [],
                "rendered_image_path": None,
                "rendered_image_url": None,
                "source_pdf_page_ref": str(pn),
                "has_visual_assets": bool(p.get("has_visual_assets")),
                "suggested_questions": sug_global[:6],
                "extraction_risk": None,
                "uncertainties": [],
                "created_at": now_iso,
                "updated_at": now_iso,
            }
        )
    _batched_insert(client, "document_pages", page_rows)

    # --- sections ---
    section_rows: list[dict[str, Any]] = []
    stack: list[dict[str, Any]] = []
    heading_titles = [h[1] for h in headings]
    for level, title, line_i in headings:
        while stack and stack[-1]["level"] >= level:
            stack.pop()
        parent_id = stack[-1]["id"] if stack else None
        char_off = sum(len(x) + 1 for x in cleaned.splitlines()[:line_i])
        sid = _new_id()
        page_guess = _page_for_ratio(char_off, len(cleaned), total_pages)
        section_rows.append(
            {
                "id": sid,
                "user_id": user_id,
                "document_id": document_id,
                "analysis_id": analysis_id,
                "title": title[:500],
                "level": level,
                "parent_id": parent_id,
                "page_start": page_guess,
                "page_end": page_guess,
                "summary": (title[:200] + "…") if len(title) > 200 else title,
                "keywords": _keywords_from_text(title),
                "representative_pages": [page_guess] if page_guess else [],
                "created_at": now_iso,
                "updated_at": now_iso,
            }
        )
        stack.append({"id": sid, "level": level})
    _batched_insert(client, "document_sections", section_rows)

    # map heading title -> section id (first occurrence)
    title_to_sid = {str(r["title"]): str(r["id"]) for r in section_rows}

    # --- chunks ---
    chunks = _chunk_text(cleaned)
    chunk_rows: list[dict[str, Any]] = []
    offset = 0
    for ch in chunks:
        mid = offset + max(1, len(ch) // 2)
        page_num = _page_for_ratio(mid, len(cleaned), total_pages)
        section_path_parts: list[str] = []
        sec_id = None
        for _lv, tit, li in headings:
            line_off = sum(len(x) + 1 for x in cleaned.splitlines()[:li])
            if line_off <= mid:
                section_path_parts.append(tit)
                sec_id = title_to_sid.get(tit)
        section_path = " / ".join(section_path_parts[-4:]) if section_path_parts else None
        ctype = "table" if "|" in ch and "\n|" in ch else "text"
        if re.search(r"!\[[^\]]*\]\([^)]+\)", ch):
            ctype = "visual_context"
        chunk_rows.append(
            {
                "id": _new_id(),
                "user_id": user_id,
                "document_id": document_id,
                "analysis_id": analysis_id,
                "chunk_type": ctype,
                "page_number": page_num,
                "section_id": sec_id,
                "section_path": section_path,
                "keywords": _keywords_from_text(ch),
                "chunk_text": ch[:120_000],
                "has_visual": bool(re.search(r"!\[[^\]]*\]\([^)]+\)", ch)),
                "related_visual_asset_ids": [],
                "created_at": now_iso,
                "updated_at": now_iso,
            }
        )
        offset += len(ch) + 2
    _batched_insert(client, "document_chunks", chunk_rows)

    # --- visuals ---
    visual_rows: list[dict[str, Any]] = []
    for rel in manifest.get("image_files") or []:
        rel_s = str(rel).strip()
        if not rel_s:
            continue
        name = Path(rel_s).name
        storage_path = f"{storage_raw_prefix}/{rel_s}"
        page_guess = None
        m = re.search(r"page[_\-]?(\d+)", name, re.I)
        if m:
            try:
                page_guess = int(m.group(1))
            except ValueError:
                page_guess = None
        vtype = _visual_type_from_name(name)
        desc = f"Visual asset extracted from the document ({name})."
        visual_rows.append(
            {
                "id": _new_id(),
                "user_id": user_id,
                "document_id": document_id,
                "analysis_id": analysis_id,
                "source_page_number": page_guess,
                "type": vtype,
                "semantic_category": "mineru_output",
                "title": name[:200],
                "description": desc,
                "image_path": storage_path,
                "image_url": None,
                "extracted_labels": [name],
                "retrieval_tags": _keywords_from_text(name),
                "related_terms": [],
                "related_sections": [],
                "confidence": 0.35,
                "created_at": now_iso,
                "updated_at": now_iso,
            }
        )
    _batched_insert(client, "document_visual_assets", visual_rows)

    # --- glossary ---
    gloss_rows: list[dict[str, Any]] = []
    seen_terms: set[str] = set()
    for tit in heading_titles[:60]:
        key = tit.strip().lower()
        if len(tit) < 2 or key in seen_terms:
            continue
        seen_terms.add(key)
        gloss_rows.append(
            {
                "id": _new_id(),
                "user_id": user_id,
                "document_id": document_id,
                "analysis_id": analysis_id,
                "term": tit[:200],
                "definition": "Auto-extracted section heading; definition can be refined later.",
                "category": "auto-extracted",
                "pages": [],
                "related_terms": [],
                "created_at": now_iso,
                "updated_at": now_iso,
            }
        )
    for term in _extract_bold_terms(cleaned, 60):
        key = term.lower()
        if key in seen_terms or len(term) < 2:
            continue
        seen_terms.add(key)
        gloss_rows.append(
            {
                "id": _new_id(),
                "user_id": user_id,
                "document_id": document_id,
                "analysis_id": analysis_id,
                "term": term[:200],
                "definition": "Auto-extracted emphasized term from the document.",
                "category": "auto-extracted",
                "pages": [],
                "related_terms": [],
                "created_at": now_iso,
                "updated_at": now_iso,
            }
        )
    for term, cnt in Counter(_keywords_from_text(cleaned, 200)).most_common(40):
        if cnt < 3 or len(term) < 3:
            continue
        key = term.lower()
        if key in seen_terms:
            continue
        seen_terms.add(key)
        gloss_rows.append(
            {
                "id": _new_id(),
                "user_id": user_id,
                "document_id": document_id,
                "analysis_id": analysis_id,
                "term": term[:200],
                "definition": f"Recurring term in this document (approx. {cnt} mentions).",
                "category": "auto-extracted",
                "pages": [],
                "related_terms": [],
                "created_at": now_iso,
                "updated_at": now_iso,
            }
        )
    _batched_insert(client, "document_glossary_terms", gloss_rows)

    client.table("knowledge_items").update(
        {
            "raw_content": kb_raw,
            "date_modified": now_iso,
        }
    ).eq("id", document_id).eq("user_id", user_id).execute()

    stats = {
        "analysis_id": analysis_id,
        "pages": len(page_rows),
        "sections": len(section_rows),
        "chunks": len(chunk_rows),
        "visuals": len(visual_rows),
        "glossary": len(gloss_rows),
    }
    log.info(
        "[mineru-worker] docoracle_normalized document_id=%s stats=%s",
        document_id,
        stats,
    )
    return {
        **stats,
        "executive_summary": exec_summary,
        "kb_raw_content": kb_raw,
        "total_pages": total_pages,
        "document_type": doc_type,
        "language": lang,
    }


def _batched_insert(client: Client, table: str, rows: list[dict[str, Any]], batch_size: int = 120) -> None:
    if not rows:
        return
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        try:
            client.table(table).insert(batch).execute()
        except Exception as e:
            raise DocOracleNormalizationError(f"insert_failed:{table}:{type(e).__name__}:{e!s}") from e
