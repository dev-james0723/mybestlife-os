#!/bin/sh
set -e

# Railway sets PORT for the public worker API.
PORT="${PORT:-8790}"

# Internal MinerU API used only inside this container.
MINERU_API_HOST="${MINERU_API_HOST:-127.0.0.1}"
MINERU_API_PORT="${MINERU_API_PORT:-8877}"
export MINERU_INTERNAL_API_URL="${MINERU_INTERNAL_API_URL:-http://${MINERU_API_HOST}:${MINERU_API_PORT}}"

echo "[mineru-worker] starting internal mineru-api at ${MINERU_INTERNAL_API_URL}"
mineru-api --host "$MINERU_API_HOST" --port "$MINERU_API_PORT" &
MINERU_API_PID="$!"

echo "[mineru-worker] waiting for internal mineru-api..."
for i in $(seq 1 120); do
  if curl -fsS "${MINERU_INTERNAL_API_URL}/openapi.json" >/dev/null 2>&1; then
    echo "[mineru-worker] internal mineru-api is ready"
    break
  fi

  if ! kill -0 "$MINERU_API_PID" >/dev/null 2>&1; then
    echo "[mineru-worker] internal mineru-api exited before becoming ready"
    wait "$MINERU_API_PID"
    exit 1
  fi

  if [ "$i" -eq 120 ]; then
    echo "[mineru-worker] internal mineru-api did not become ready within 120s"
    exit 1
  fi

  sleep 1
done

echo "[mineru-worker] starting public worker API on port ${PORT}"
uvicorn src.main:app --host 0.0.0.0 --port "$PORT" &
WORKER_PID="$!"

trap 'echo "[mineru-worker] shutting down"; kill "$WORKER_PID" "$MINERU_API_PID" 2>/dev/null || true; wait' INT TERM

wait "$WORKER_PID"
