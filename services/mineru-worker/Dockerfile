# Doc Oracle MinerU worker — Railway / container hosts.
# Heavy ML deps (mineru/PyTorch) are installed in a separate layer so they are
# cached across builds and only reinstalled when their pinned versions change.
FROM python:3.12-slim

WORKDIR /app
ENV PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=600 \
    MINERU_BACKEND=pipeline

# System libs for OpenCV / PDF / scientific stack.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    libglib2.0-0 \
    libgl1 \
    libgomp1 \
    libsm6 \
    libxext6 \
    libxrender1 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Layer 1: heavy ML dependencies — cached unless these specific versions change.
# Pipeline extra only (Doc Oracle); avoids vllm/gradio/router/MCP/UI bundles from mineru[all].
RUN pip install --no-cache-dir --upgrade pip setuptools wheel \
    && pip install --no-cache-dir "mineru[pipeline]>=3.0.0" "supabase>=2.10.0,<3"

# Confirm CLI is on PATH (build fails early if MinerU did not install entry points).
RUN which mineru

# Layer 2: lightweight app dependencies — rebuilds only when requirements.txt changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src ./src
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 8790
ENTRYPOINT ["/docker-entrypoint.sh"]
