FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app/backend

COPY backend/requirements/ ./requirements/

RUN pip install --no-cache-dir -r requirements/tooling.txt && \
    pip install --no-cache-dir -r requirements/dev.txt

COPY backend/ /app/backend/

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000", "--settings=config.settings.local"]
