from __future__ import annotations

from importlib.metadata import version
from io import BytesIO
from typing import Protocol

from weasyprint import HTML


class DocumentRenderer(Protocol):
    def render(self, html: str) -> bytes: ...


def _deny_external_resources(url: str):
    """Prevent arbitrary network and local-file access during rendering.

    Current Bagg templates use inline CSS and do not require external
    resources. If logo support is added, use a controlled asset resolver
    rather than enabling arbitrary URL fetching.
    """
    raise ValueError("External resources are not permitted in PDF rendering")


class WeasyPrintDocumentRenderer:
    """Render trusted, application-generated HTML to a PDF byte stream."""

    renderer_name = "weasyprint"

    @property
    def renderer_version(self) -> str:
        return version("weasyprint")

    def render(self, html: str) -> bytes:
        if not html or not html.strip():
            raise ValueError("Cannot render an empty document")

        output = BytesIO()

        HTML(
            string=html,
            url_fetcher=_deny_external_resources,
        ).write_pdf(target=output)

        content = output.getvalue()

        if not content.startswith(b"%PDF-"):
            raise RuntimeError("PDF renderer returned an invalid PDF document")

        return content
