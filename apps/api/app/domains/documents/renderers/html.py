from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

# html.py -> renderers -> documents -> domains -> app
APP_DIR = Path(__file__).resolve().parents[3]
TEMPLATES_DIR = APP_DIR / "templates"

_environment = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(
        enabled_extensions=("html", "htm", "xml"),
        default_for_string=True,
    ),
)


def render_html_template(template_name: str, context: dict) -> str:
    """Render a named HTML template from the application's template folder."""
    template = _environment.get_template(template_name)
    return template.render(**context)


def render_invoice_document_html(document) -> str:
    """Render an InvoiceDocument using the existing invoice template."""
    context = {
        "invoice_number": document.invoice_number,
        "issue_date": document.formatted_issue_date,
        "due_date": document.formatted_due_date,
        "items": [
            {
                "description": item.description,
                "quantity": item.quantity,
                "formatted_unit_price": item.formatted_unit_price,
                "formatted_total": item.formatted_total,
            }
            for item in document.items
        ],
        "formatted_subtotal": document.formatted_subtotal,
        "formatted_tax": document.formatted_tax,
        "formatted_total": document.formatted_total,
    }

    return render_html_template("invoice.html", context)
