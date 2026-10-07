# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Django Backend
FROM python:3.12-slim
WORKDIR /app

# Install system packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy backend codebase
COPY . .

# Copy compiled frontend distribution from stage 1
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Create directories for persistent SQLite DB and static files
RUN mkdir -p /app/data /app/staticfiles

EXPOSE 8000

ENV PYTHONUNBUFFERED=1
ENV DEBUG=False
ENV SQLITE_DIR=/app/data

CMD ["sh", "-c", "python manage.py migrate && python manage.py seed_data && python manage.py collectstatic --noinput && gunicorn cas_exam.wsgi:application --bind 0.0.0.0:8000 --workers 3"]
