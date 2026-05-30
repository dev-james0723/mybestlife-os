# VoxCPM TTS Sidecar

FastAPI service that wraps VoxCPM for app-wide text-to-speech.

## Local Setup

```bash
cd services/voxcpm-tts
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
VOXCPM_API_KEY=dev-secret uvicorn main:app --host 127.0.0.1 --port 7860
```

From the repo root you can also start the sidecar with:

```bash
npm run dev:tts
```

Then set the Next.js app env:

```bash
DOCORACLE_AUDIO_PROVIDER=voxcpm
VOXCPM_BASE_URL=http://127.0.0.1:7860
VOXCPM_API_KEY=dev-secret
```

Keep `npm run dev:tts` running while using Analytics → Audio Overview or other in-app TTS features.

VoxCPM currently targets Python 3.10-3.12. Do not install it into this machine's
default `python3` if that points at Python 3.13+.

Production should run this service on a Python GPU host with a compatible
PyTorch/CUDA stack. The Next.js app only needs network access to
`VOXCPM_BASE_URL`.
