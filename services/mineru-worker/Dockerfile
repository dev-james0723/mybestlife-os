FROM python:3.12-slim

WORKDIR /app
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src ./src
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Railway sets PORT at runtime; local default is 8790 (see docker-entrypoint.sh).
EXPOSE 8790
ENTRYPOINT ["/docker-entrypoint.sh"]
