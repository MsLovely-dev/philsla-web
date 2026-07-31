import importlib.util
from pathlib import Path

from django.test import SimpleTestCase

ROOT = Path(__file__).resolve().parents[4]
SCRIPT_PATH = ROOT / "scripts" / "generate_permission_catalog.py"
SPEC = importlib.util.spec_from_file_location("permission_catalog_codegen", SCRIPT_PATH)
permission_catalog_codegen = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(permission_catalog_codegen)


class PermissionCatalogGenerationTests(SimpleTestCase):
    def test_frontend_permission_catalog_matches_backend_catalog(self) -> None:
        expected = permission_catalog_codegen.render_frontend_catalog(permission_catalog_codegen.load_catalog())

        self.assertEqual(permission_catalog_codegen.FRONTEND_CATALOG.read_text(encoding="utf-8"), expected)

    def test_permission_catalog_artifacts_are_deploy_local(self) -> None:
        self.assertEqual(
            permission_catalog_codegen.BACKEND_CATALOG,
            ROOT / "backend" / "apps" / "accounts" / "permission_catalog.json",
        )
        self.assertEqual(
            permission_catalog_codegen.FRONTEND_CATALOG,
            ROOT / "frontend" / "src" / "generated" / "permissionCatalog.ts",
        )
