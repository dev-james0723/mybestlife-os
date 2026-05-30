import io
import os
import re
import tempfile
import threading
from pathlib import Path
from typing import Optional

import numpy as np
import soundfile as sf
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import Response

app = FastAPI(title="My Life OS VoxCPM TTS")

_model = None
_model_lock = threading.Lock()


def _require_api_key(authorization: Optional[str]) -> None:
    expected = os.environ.get("VOXCPM_API_KEY", "").strip()
    if not expected:
        return
    if authorization != f"Bearer {expected}":
        raise HTTPException(status_code=401, detail="invalid_api_key")


def _load_model():
    global _model
    if _model is not None:
        return _model
    with _model_lock:
        if _model is not None:
            return _model
        from voxcpm import VoxCPM

        model_id = os.environ.get("VOXCPM_MODEL_ID", "openbmb/VoxCPM2")
        device = os.environ.get("VOXCPM_DEVICE", "auto")
        kwargs = {
            "load_denoiser": os.environ.get("VOXCPM_LOAD_DENOISER", "false").lower()
            == "true",
        }
        if device and device != "auto":
            kwargs["device"] = device
        _model = VoxCPM.from_pretrained(model_id, **kwargs)
        return _model


def _with_control(text: str, voice_control: str | None) -> str:
    control = (voice_control or "").strip()
    if not control:
        return text.strip()
    if text.lstrip().startswith("("):
        return text.strip()
    return f"({control}){text.strip()}"


def _split_text(text: str, max_chars: int) -> list[str]:
    cleaned = re.sub(r"\s+", " ", text).strip()
    if len(cleaned) <= max_chars:
        return [cleaned]
    parts = re.split(r"(?<=[.!?。！？])\s+", cleaned)
    chunks: list[str] = []
    current = ""
    for part in parts:
        if not part:
            continue
        if len(current) + len(part) + 1 <= max_chars:
            current = f"{current} {part}".strip()
            continue
        if current:
            chunks.append(current)
        if len(part) <= max_chars:
            current = part
        else:
            for i in range(0, len(part), max_chars):
                chunks.append(part[i : i + max_chars])
            current = ""
    if current:
        chunks.append(current)
    return chunks


async def _save_upload(upload: UploadFile | None) -> str | None:
    if upload is None:
        return None
    suffix = Path(upload.filename or "reference.wav").suffix or ".wav"
    fd, path = tempfile.mkstemp(prefix="voxcpm_ref_", suffix=suffix)
    os.close(fd)
    with open(path, "wb") as handle:
        while True:
            block = await upload.read(1024 * 1024)
            if not block:
                break
            handle.write(block)
    return path


@app.on_event("startup")
def preload_model_in_background() -> None:
    """Load weights on boot so /health stays responsive and first /synthesize is faster."""

    def _runner() -> None:
        try:
            _load_model()
        except Exception as exc:  # noqa: BLE001 — surface in logs, not on /health
            print(f"[voxcpm] background preload failed: {exc}")

    threading.Thread(target=_runner, name="voxcpm-preload", daemon=True).start()


@app.get("/health")
def health():
    return {
        "ok": True,
        "model_loaded": _model is not None,
        "model_id": os.environ.get("VOXCPM_MODEL_ID", "openbmb/VoxCPM2"),
    }


@app.post("/synthesize")
async def synthesize(
    text: str = Form(...),
    language: str = Form("auto"),
    mode: str = Form("preset"),
    voice_control: str = Form(""),
    prompt_text: str = Form(""),
    cfg_value: float = Form(2.0),
    inference_timesteps: int = Form(10),
    reference_audio: UploadFile | None = File(default=None),
    authorization: Optional[str] = Header(default=None),
):
    _require_api_key(authorization)
    clean_text = text.strip()
    if not clean_text:
        raise HTTPException(status_code=400, detail="empty_text")
    if mode not in {"preset", "reference_clone"}:
        raise HTTPException(status_code=400, detail="invalid_mode")

    max_chars = int(os.environ.get("VOXCPM_CHUNK_CHARS", "900"))
    reference_path = await _save_upload(reference_audio)
    model = _load_model()
    sample_rate = int(model.tts_model.sample_rate)

    try:
        chunks = _split_text(clean_text, max_chars)
        audio_chunks = []
        for chunk in chunks:
            final_text = _with_control(chunk, voice_control)
            generate_kwargs = {
                "text": final_text,
                "cfg_value": cfg_value,
                "inference_timesteps": inference_timesteps,
            }
            if reference_path:
                if prompt_text.strip():
                    generate_kwargs["prompt_wav_path"] = reference_path
                    generate_kwargs["prompt_text"] = prompt_text.strip()
                generate_kwargs["reference_wav_path"] = reference_path
            audio_chunks.append(np.asarray(model.generate(**generate_kwargs)))

        wav = audio_chunks[0] if len(audio_chunks) == 1 else np.concatenate(audio_chunks)
        out = io.BytesIO()
        sf.write(out, wav, sample_rate, format="WAV")
        return Response(content=out.getvalue(), media_type="audio/wav")
    finally:
        if reference_path:
            try:
                os.remove(reference_path)
            except OSError:
                pass
