# Doc Oracle MinerU worker — Railway / container hosts.
# MinerU pulls PyTorch and models; expect a large image and a long first build.
FROM python:3.12-bookworm

WORKDIR /app
ENV PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=600 \
    MINERU_BACKEND=pipeline

# Native libs commonly required by OpenCV / PDF / scientific stack used by MinerU.
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
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r requirements.txt

# Confirm CLI is on PATH (build fails early if MinerU did not install entry points).
RUN which mineru

COPY src ./src
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 8790
ENTRYPOINT ["/docker-entrypoint.sh"]
