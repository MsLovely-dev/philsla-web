import json
import logging
from datetime import UTC, datetime
from typing import Any


class SafeJsonFormatter(logging.Formatter):
    """Format log records as JSON using only explicitly provided safe fields."""

    SAFE_EXTRA_FIELDS = {
        "correlation_id",
        "duration_ms",
        "event",
        "method",
        "outcome",
        "route",
        "status_code",
        "user_id",
    }

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, tz=UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        for field in self.SAFE_EXTRA_FIELDS:
            if hasattr(record, field):
                payload[field] = getattr(record, field)

        return json.dumps(payload, separators=(",", ":"), sort_keys=True)
