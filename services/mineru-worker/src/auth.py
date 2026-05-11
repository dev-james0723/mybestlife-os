import os
from fastapi import HTTPException, Header


def require_worker_secret(authorization: str | None) -> None:
    secret = os.environ.get("MINERU_WORKER_SECRET", "").strip()
    if not secret:
        raise HTTPException(status_code=503, detail="worker_secret_not_configured")
    token = ""
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
    if token != secret:
        raise HTTPException(status_code=401, detail="unauthorized")
