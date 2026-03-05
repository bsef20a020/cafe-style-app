FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    NOFFELO_DB=/data/noffelo.db \
    NOFFELO_HOST=0.0.0.0 \
    NOFFELO_PORT=8787

WORKDIR /app
COPY server.py /app/server.py

EXPOSE 8787
CMD ["python", "/app/server.py"]
