#!/bin/sh
set -e
# Railway (and many PaaS) set PORT; local Docker defaults to 8790.
PORT="${PORT:-8790}"
exec uvicorn src.main:app --host 0.0.0.0 --port "$PORT"
