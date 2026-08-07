import csv
from collections.abc import Iterable, Iterator
from datetime import date

from django.http import StreamingHttpResponse


class _Echo:
    """A write-only file-like object that returns what it's given, so
    ``csv.writer`` can yield each rendered row for streaming."""

    def write(self, value: str) -> str:
        return value


def csv_safe(value: object) -> str:
    """Neutralize CSV/formula injection: a cell beginning with =, +, -, @, tab,
    or CR is prefixed with a single quote so spreadsheets treat it as text.
    ``csv.writer`` handles RFC-4180 quoting (commas/quotes/newlines) separately.
    """
    text = "" if value is None else str(value)
    if text[:1] in ("=", "+", "-", "@", "\t", "\r"):
        return f"'{text}"
    return text


def stream_csv(
    header: list[str],
    rows: Iterable[list[object]],
    filename: str,
) -> StreamingHttpResponse:
    """Stream ``rows`` as a CSV attachment. Values are passed through
    ``csv_safe`` before being written."""
    writer = csv.writer(_Echo())

    def lines() -> Iterator[str]:
        yield writer.writerow(header)
        for row in rows:
            yield writer.writerow([csv_safe(cell) for cell in row])

    response = StreamingHttpResponse(lines(), content_type="text/csv")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


def dated_filename(stem: str) -> str:
    return f"{stem}_{date.today().isoformat()}.csv"
