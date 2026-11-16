import pytest

pytest.importorskip("weasyprint")

from app.domains.documents.renderers.pdf import (
    WeasyPrintDocumentRenderer,
    _deny_external_resources,
)


def test_render_returns_pdf_bytes():
    renderer = WeasyPrintDocumentRenderer()

    result = renderer.render("""
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              @page { size: A4; margin: 20mm; }
              body { font-family: sans-serif; }
            </style>
          </head>
          <body>
            <h1>Bagg Invoice</h1>
            <p>Invoice INV-001</p>
          </body>
        </html>
        """)

    assert isinstance(result, bytes)
    assert result.startswith(b"%PDF-")
    assert len(result) > 500


@pytest.mark.parametrize("html", ["", " ", "\n\t"])
def test_render_rejects_empty_html(html):
    renderer = WeasyPrintDocumentRenderer()

    with pytest.raises(ValueError, match="empty document"):
        renderer.render(html)


def test_renderer_exposes_version():
    renderer = WeasyPrintDocumentRenderer()

    assert renderer.renderer_name == "weasyprint"
    assert renderer.renderer_version
    assert isinstance(renderer.renderer_version, str)


@pytest.mark.parametrize(
    "url",
    [
        "https://example.com/image.png",
        "http://example.com/style.css",
        "file:///etc/passwd",
        "file:///app/secrets.env",
    ],
)
def test_resource_fetcher_rejects_external_and_local_urls(url):
    with pytest.raises(
        ValueError,
        match="External resources are not permitted",
    ):
        _deny_external_resources(url)


def test_render_handles_unicode_content():
    renderer = WeasyPrintDocumentRenderer()

    result = renderer.render("""
        <!doctype html>
        <html>
          <head><meta charset="utf-8"></head>
          <body>
            <h1>Invoice for Chukwuemeka</h1>
            <p>Amount: ₦125,000.00</p>
            <p>Client: Zoë Müller</p>
          </body>
        </html>
        """)

    assert result.startswith(b"%PDF-")
    assert len(result) > 500


def test_render_handles_multipage_content():
    renderer = WeasyPrintDocumentRenderer()

    paragraphs = "".join(
        f"<p>Document paragraph {index}. " + ("Bagg document content. " * 30) + "</p>"
        for index in range(250)
    )

    result = renderer.render(f"""
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              @page {{ size: A4; margin: 20mm; }}
              body {{ font-size: 12px; }}
            </style>
          </head>
          <body>{paragraphs}</body>
        </html>
        """)

    assert result.startswith(b"%PDF-")
    assert len(result) > 5_000
