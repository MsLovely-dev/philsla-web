"""Shared bulk-import machinery for the Maintenance Center registries.

Imports are **atomic**: every row is validated through the same serializer the
single-create path uses, and rows are only persisted if *all* of them are valid.
Any invalid row aborts the whole batch and reports per-row errors, so an admin
fixes the file and re-uploads rather than ending up with a partially applied
registry.
"""

from collections.abc import Callable
from typing import Any

from django.conf import settings
from django.db import transaction
from rest_framework.exceptions import APIException, ValidationError


class ImportValidationError(APIException):
    """One or more rows failed validation.

    The per-row report is attached as ``error_meta`` so the shared API envelope
    surfaces it under ``error.meta.rows`` — ``api_exception_handler`` copies
    ``getattr(exc, "error_meta", {})`` into ``meta`` with no special-casing.
    """

    status_code = 400
    default_code = "import_validation"
    default_detail = "Some rows could not be imported. No changes were made."

    def __init__(self, rows: list[dict[str, Any]], detail: str | None = None) -> None:
        super().__init__(detail or self.default_detail)
        self.error_meta = {"rows": rows}


def normalize_region_factory(text_choices, field: str = "region") -> Callable[[dict], dict]:
    """Build a row normalizer that accepts a region given as either its stored
    code (``"NCR"``, ``"Region IV-A"``) or its human display label, rewriting the
    label to the code. Lets a file exported with region *labels* round-trip back
    through import.
    """
    label_to_value = {label: value for value, label in text_choices.choices}
    valid_values = set(text_choices.values)

    def normalize(row: dict) -> dict:
        value = row.get(field)
        if isinstance(value, str) and value not in valid_values and value in label_to_value:
            row = dict(row)
            row[field] = label_to_value[value]
        return row

    return normalize


def run_bulk_import(
    serializer_class,
    rows,
    *,
    save_kwargs: dict | None = None,
    serializer_context: dict | None = None,
    normalize: Callable[[dict], dict] | None = None,
    duplicate_key: Callable[[dict], Any] | None = None,
    duplicate_message: dict | None = None,
) -> int:
    """Validate ``rows`` through ``serializer_class`` and, only if every row is
    valid, create them in a single transaction. Returns the created count.

    Raises ``rest_framework.ValidationError`` for a malformed payload (not a
    list, empty, or over ``MAINTENANCE_IMPORT_MAX_ROWS``) and
    ``ImportValidationError`` with a per-row report when any row is invalid.

    ``duplicate_key`` guards against two identical *new* rows in the same file:
    DB uniqueness constraints only fire at INSERT time, which would abort the
    whole atomic block with an opaque error instead of a clear per-row message.
    """
    if not isinstance(rows, list):
        raise ValidationError({"rows": ["Expected a list of rows to import."]})
    if not rows:
        raise ValidationError({"rows": ["There are no rows to import."]})
    max_rows = getattr(settings, "MAINTENANCE_IMPORT_MAX_ROWS", 1000)
    if len(rows) > max_rows:
        raise ValidationError(
            {"rows": [f"Too many rows: {len(rows)} exceeds the per-import limit of {max_rows}."]}
        )

    save_kwargs = save_kwargs or {}
    serializer_context = serializer_context or {}

    valid_serializers = []
    row_errors: list[dict[str, Any]] = []
    seen_keys: dict[Any, int] = {}

    for index, raw in enumerate(rows):
        if not isinstance(raw, dict):
            row_errors.append({"row": index, "fields": {"row": ["Each row must be an object."]}})
            continue

        data = normalize(raw) if normalize is not None else raw
        serializer = serializer_class(data=data, context=serializer_context)
        if not serializer.is_valid():
            row_errors.append({"row": index, "fields": serializer.errors})
            continue

        if duplicate_key is not None:
            key = duplicate_key(serializer.validated_data)
            if key is not None and key in seen_keys:
                row_errors.append(
                    {"row": index, "fields": duplicate_message or {"row": ["Duplicate row in file."]}}
                )
                continue
            if key is not None:
                seen_keys[key] = index

        valid_serializers.append(serializer)

    if row_errors:
        raise ImportValidationError(rows=row_errors)

    with transaction.atomic():
        for serializer in valid_serializers:
            serializer.save(**save_kwargs)
    return len(valid_serializers)
