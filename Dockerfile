FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy models and datasets required for predictions
COPY models/ ./models/
COPY datasets/processed/ ./datasets/processed/

# Copy backend source code
COPY backend/app/ ./backend/app/

# Environment configurations
ENV PYTHONPATH=/app/backend
ENV PORT=8000
ENV FIFA_PROJECT_ROOT=/app

EXPOSE 8000

CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT}"]
