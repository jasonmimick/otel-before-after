# Build stage
FROM python:3.11-slim AS builder

WORKDIR /app
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Runtime stage
FROM python:3.11-slim

WORKDIR /app

RUN useradd -m -u 1001 fintech
COPY --from=builder --chown=fintech:fintech /root/.local /home/fintech/.local
COPY --chown=fintech:fintech . .

USER fintech
ENV PATH=/home/fintech/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
