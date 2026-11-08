"""Architecture regression tests for invoice and quote persistence boundaries."""

from __future__ import annotations

import ast
from pathlib import Path
import unittest

API_ROOT = Path(__file__).resolve().parents[2]


class PersistenceBoundaryTests(unittest.TestCase):
    def _tree(self, relative_path: str) -> ast.AST:
        return ast.parse((API_ROOT / relative_path).read_text(encoding="utf-8"))

    def _calls(self, tree: ast.AST) -> set[str]:
        found: set[str] = set()
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call):
                continue
            func = node.func
            if isinstance(func, ast.Attribute) and isinstance(func.value, ast.Name):
                if func.value.id == "db":
                    found.add(func.attr)
        return found

    def test_invoice_and_quote_routers_do_not_import_other_routers(self) -> None:
        for relative_path in (
            "app/domains/invoices/router.py",
            "app/domains/quotes/router.py",
        ):
            tree = self._tree(relative_path)
            imported_modules = [
                node.module or ""
                for node in ast.walk(tree)
                if isinstance(node, ast.ImportFrom)
            ]
            self.assertFalse(
                any(module.endswith(".router") for module in imported_modules),
                f"{relative_path} imports another router: {imported_modules}",
            )

    def test_invoice_router_has_no_persistence_calls(self) -> None:
        calls = self._calls(self._tree("app/domains/invoices/router.py"))
        self.assertFalse(
            calls.intersection(
                {"execute", "add", "add_all", "delete", "commit", "flush"}
            ),
            f"Invoice router contains persistence calls: {calls}",
        )

    def test_quote_router_has_no_persistence_calls(self) -> None:
        calls = self._calls(self._tree("app/domains/quotes/router.py"))
        self.assertFalse(
            calls.intersection(
                {"execute", "add", "add_all", "delete", "commit", "flush"}
            ),
            f"Quote router contains persistence calls: {calls}",
        )

    def test_invoice_and_quote_services_do_not_build_or_execute_queries(self) -> None:
        forbidden = {"execute", "add", "add_all", "delete", "flush", "refresh"}
        for relative_path in (
            "app/domains/invoices/service.py",
            "app/domains/quotes/service.py",
        ):
            calls = self._calls(self._tree(relative_path))
            self.assertFalse(
                calls.intersection(forbidden),
                f"{relative_path} bypasses its repository: {calls}",
            )

    def test_invoice_repository_is_workspace_scoped(self) -> None:
        tree = self._tree("app/domains/invoices/repository.py")
        methods = {
            node.name: node
            for node in ast.walk(tree)
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
        }
        for method_name in ("get", "get_for_update", "get_with_client", "get_client"):
            source = ast.get_source_segment(
                (API_ROOT / "app/domains/invoices/repository.py").read_text(),
                methods[method_name],
            )
            self.assertIn("workspace_id", source, method_name)

    def test_quote_repository_has_explicit_row_locking(self) -> None:
        source = (API_ROOT / "app/domains/quotes/repository.py").read_text()
        self.assertIn("get_public_for_update", source)
        self.assertIn("with_for_update", source)
        self.assertIn("get_workspace_for_update", source)

    def test_invoice_recall_service_delegates_queries_to_repository(self) -> None:
        calls = self._calls(self._tree("app/domains/invoices/recall_service.py"))
        self.assertFalse(
            calls.intersection({"execute", "add", "flush", "refresh"}),
            f"Invoice recall service bypasses its repository: {calls}",
        )

    def test_recall_document_version_model_is_registered(self) -> None:
        source = (API_ROOT / "app/models.py").read_text()
        self.assertIn("app.domains.invoices.recall_models", source)

    def test_invoice_recall_endpoint_is_exposed(self) -> None:
        source = (API_ROOT / "app/domains/invoices/router.py").read_text()
        self.assertIn('@router.post("/{invoice_id}/recall"', source)

    def test_recall_is_part_of_invoice_revision_workflow(self) -> None:
        service = (API_ROOT / "app/domains/invoices/service.py").read_text()
        self.assertIn("InvoiceRecallService.recall(", service)
        self.assertIn("create_issued_snapshot", service)
        self.assertIn("commit=False", service)


if __name__ == "__main__":
    unittest.main()
