from urllib.parse import parse_qsl, unquote, urlparse

from django.core.exceptions import ImproperlyConfigured


def database_config_from_url(database_url: str) -> dict[str, object]:
    parsed = urlparse(database_url)
    if parsed.scheme not in {"postgres", "postgresql"}:
        raise ImproperlyConfigured("DATABASE_URL must use a PostgreSQL scheme.")
    if not parsed.hostname:
        raise ImproperlyConfigured("DATABASE_URL must include a database host.")
    if not parsed.path or parsed.path == "/":
        raise ImproperlyConfigured("DATABASE_URL must include a database name.")

    options = {key: value for key, value in parse_qsl(parsed.query)}
    options.setdefault("sslmode", "require")

    config: dict[str, object] = {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": unquote(parsed.path.lstrip("/")),
        "USER": unquote(parsed.username or ""),
        "PASSWORD": unquote(parsed.password or ""),
        "HOST": parsed.hostname,
        "OPTIONS": options,
    }
    if parsed.port:
        config["PORT"] = parsed.port

    return config
