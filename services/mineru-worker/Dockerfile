# Doc Oracle MinerU worker — Railway / container hosts.
# All Python deps install in one pip transaction so FastAPI/Pydantic stay consistent with MinerU.
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

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r requirements.txt \
    && python -c "import fastapi, pydantic; from fastapi import FastAPI; print('fastapi', fastapi.__version__, 'pydantic', pydantic.__version__)" \
    && which mineru

COPY src ./src
RUN python -c "import src.main; print('worker main import ok')"

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 8790
ENTRYPOINT ["/docker-entrypoint.sh"]
