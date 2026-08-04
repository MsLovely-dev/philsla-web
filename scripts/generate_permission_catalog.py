from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
BACKEND_CATALOG = ROOT / "backend" / "apps" / "accounts" / "permission_catalog.json"
FRONTEND_CATALOG = ROOT / "frontend" / "src" / "generated" / "permissionCatalog.ts"


def load_catalog() -> dict[str, Any]:
    with BACKEND_CATALOG.open(encoding="utf-8") as catalog_file:
        return json.load(catalog_file)


def render_frontend_catalog(catalog: dict[str, Any]) -> str:
    default_range = catalog["defaultRange"]
    module_lines = [
        f"    '{module_id}': {render_ts_string_array(actions)},"
        for module_id, actions in sorted(catalog["modules"].items(), key=lambda item: int(item[0]))
    ]
    return (
        "// Generated from backend/apps/accounts/permission_catalog.json.\n"
        "// Run `python scripts/generate_permission_catalog.py` after catalog changes.\n\n"
        "export const permissionCatalog = {\n"
        "  defaultRange: {\n"
        f"    start: {int(default_range['start'])},\n"
        f"    end: {int(default_range['end'])},\n"
        f"    actions: {render_ts_string_array(default_range['actions'])},\n"
        "  },\n"
        "  modules: {\n"
        f"{chr(10).join(module_lines)}\n"
        "  },\n"
        "} as const;\n"
    )


def render_ts_string_array(values: list[str]) -> str:
    return "[" + ", ".join(f"'{value}'" for value in values) + "]"


def write_generated_catalog() -> None:
    FRONTEND_CATALOG.write_text(render_frontend_catalog(load_catalog()), encoding="utf-8")


def check_generated_catalog() -> bool:
    return FRONTEND_CATALOG.read_text(encoding="utf-8") == render_frontend_catalog(load_catalog())


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="fail if the generated frontend catalog is stale")
    args = parser.parse_args()

    if args.check:
        if check_generated_catalog():
            return 0
        print(f"{FRONTEND_CATALOG.relative_to(ROOT)} is stale; run python scripts/generate_permission_catalog.py")
        return 1

    write_generated_catalog()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
