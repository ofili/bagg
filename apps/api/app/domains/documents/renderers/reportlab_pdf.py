from __future__ import annotations

from io import BytesIO
from pathlib import Path
from threading import Lock
from typing import TypeAlias
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable,
    LongTable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.domains.documents.schemas import (
    InvoiceDocument,
    QuoteDocument,
    ReceiptDocument,
)

DocumentData: TypeAlias = InvoiceDocument | QuoteDocument | ReceiptDocument

_FONT_LOCK = Lock()
_FONT_REGISTERED = False

INK = colors.HexColor("#171717")
MUTED = colors.HexColor("#666666")
BORDER = colors.HexColor("#E5E5E5")
SURFACE = colors.HexColor("#F7F7F7")
ACCENT = colors.HexColor("#16A34A")
WHITE = colors.white

PAGE_WIDTH, PAGE_HEIGHT = A4
LEFT_MARGIN = 18 * mm
RIGHT_MARGIN = 18 * mm
TOP_MARGIN = 22 * mm
BOTTOM_MARGIN = 22 * mm


def _font_candidates() -> tuple[tuple[str, str], ...]:
    """Return platform-specific font candidates.

    DejaVu Sans is preferred because it includes the Naira sign and broad
    Unicode coverage. Arial is a Windows fallback.
    """
    return (
        (
            "BaggSans",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ),
        (
            "BaggSansBold",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        ),
        (
            "BaggSans",
            "C:/Windows/Fonts/arial.ttf",
        ),
        (
            "BaggSansBold",
            "C:/Windows/Fonts/arialbd.ttf",
        ),
        (
            "BaggSans",
            "C:/Windows/Fonts/segoeui.ttf",
        ),
        (
            "BaggSansBold",
            "C:/Windows/Fonts/segoeuib.ttf",
        ),
    )


def _register_fonts() -> tuple[str, str]:
    """Register available Unicode fonts once per process.

    The API Docker image should install fonts-dejavu-core. On Windows,
    Arial is used when available. Helvetica remains a final fallback.
    """
    global _FONT_REGISTERED

    with _FONT_LOCK:
        if not _FONT_REGISTERED:
            candidates = _font_candidates()
            registered: set[str] = set()

            for name, filename in candidates:
                if name in registered:
                    continue

                path = Path(filename)
                if not path.is_file():
                    continue

                try:
                    pdfmetrics.registerFont(TTFont(name, str(path)))
                    registered.add(name)
                except (OSError, ValueError):
                    continue

            _FONT_REGISTERED = True

    if "BaggSans" in pdfmetrics.getRegisteredFontNames():
        regular = "BaggSans"
    else:
        regular = "Helvetica"

    if "BaggSansBold" in pdfmetrics.getRegisteredFontNames():
        bold = "BaggSansBold"
    else:
        bold = "Helvetica-Bold"

    return regular, bold


def _paragraph_styles() -> dict[str, ParagraphStyle]:
    regular, bold = _register_fonts()
    base = getSampleStyleSheet()

    return {
        "body": ParagraphStyle(
            "BaggBody",
            parent=base["BodyText"],
            fontName=regular,
            fontSize=8.5,
            leading=12,
            textColor=INK,
            spaceAfter=3,
            splitLongWords=1,
        ),
        "small": ParagraphStyle(
            "BaggSmall",
            parent=base["BodyText"],
            fontName=regular,
            fontSize=7,
            leading=9,
            textColor=MUTED,
        ),
        "label": ParagraphStyle(
            "BaggLabel",
            parent=base["BodyText"],
            fontName=bold,
            fontSize=7,
            leading=9,
            textColor=MUTED,
            spaceAfter=3,
        ),
        "title": ParagraphStyle(
            "BaggTitle",
            parent=base["Title"],
            fontName=bold,
            fontSize=21,
            leading=25,
            textColor=INK,
            alignment=TA_RIGHT,
            spaceAfter=3,
        ),
        "business": ParagraphStyle(
            "BaggBusiness",
            parent=base["Heading2"],
            fontName=bold,
            fontSize=14,
            leading=18,
            textColor=INK,
            spaceAfter=3,
        ),
        "section": ParagraphStyle(
            "BaggSection",
            parent=base["Heading3"],
            fontName=bold,
            fontSize=10,
            leading=13,
            textColor=INK,
            spaceBefore=12,
            spaceAfter=6,
        ),
        "table_header": ParagraphStyle(
            "BaggTableHeader",
            parent=base["BodyText"],
            fontName=bold,
            fontSize=7,
            leading=9,
            textColor=INK,
        ),
        "table_cell": ParagraphStyle(
            "BaggTableCell",
            parent=base["BodyText"],
            fontName=regular,
            fontSize=7.5,
            leading=10,
            textColor=INK,
            splitLongWords=1,
        ),
        "table_right": ParagraphStyle(
            "BaggTableRight",
            parent=base["BodyText"],
            fontName=regular,
            fontSize=7.5,
            leading=10,
            textColor=INK,
            alignment=TA_RIGHT,
        ),
        "total_label": ParagraphStyle(
            "BaggTotalLabel",
            parent=base["BodyText"],
            fontName=regular,
            fontSize=8,
            leading=11,
            textColor=MUTED,
            alignment=TA_RIGHT,
        ),
        "total_value": ParagraphStyle(
            "BaggTotalValue",
            parent=base["BodyText"],
            fontName=bold,
            fontSize=8,
            leading=11,
            textColor=INK,
            alignment=TA_RIGHT,
        ),
        "grand_total": ParagraphStyle(
            "BaggGrandTotal",
            parent=base["BodyText"],
            fontName=bold,
            fontSize=12,
            leading=16,
            textColor=INK,
            alignment=TA_RIGHT,
        ),
        "center": ParagraphStyle(
            "BaggCenter",
            parent=base["BodyText"],
            fontName=regular,
            fontSize=8,
            leading=12,
            alignment=TA_CENTER,
            textColor=INK,
        ),
        "receipt_amount": ParagraphStyle(
            "BaggReceiptAmount",
            parent=base["BodyText"],
            fontName=bold,
            fontSize=23,
            leading=28,
            alignment=TA_CENTER,
            textColor=ACCENT,
        ),
    }


def _p(value: object, style: ParagraphStyle) -> Paragraph:
    """Create an escaped Paragraph from plain text."""
    text = escape(str(value if value is not None else ""))
    text = text.replace("\n", "<br/>")
    return Paragraph(text, style)


def _money_row(
    label: str,
    value: str,
    styles: dict[str, ParagraphStyle],
    *,
    emphasis: bool = False,
) -> list[Paragraph]:
    label_style = styles["total_value"] if emphasis else styles["total_label"]
    value_style = styles["total_value"] if emphasis else styles["total_label"]

    return [
        _p(label, label_style),
        _p(value, value_style),
    ]


def _totals_table(
    rows: list[tuple[str, str, bool]],
    styles: dict[str, ParagraphStyle],
) -> Table:
    data = [
        _money_row(label, value, styles, emphasis=emphasis)
        for label, value, emphasis in rows
    ]

    table = Table(data, colWidths=[65 * mm, 48 * mm], hAlign="RIGHT")
    table.setStyle(
        TableStyle(
            [
                ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LINEABOVE", (0, -1), (-1, -1), 1.2, INK),
                ("TOPPADDING", (0, -1), (-1, -1), 9),
            ]
        )
    )
    return table


def _line_items_table(items, styles: dict[str, ParagraphStyle]) -> LongTable:
    header = [
        _p("Description", styles["table_header"]),
        _p("Qty", styles["table_header"]),
        _p("Unit price", styles["table_header"]),
        _p("Amount", styles["table_header"]),
    ]

    data = [header]

    for item in items:
        data.append(
            [
                _p(item.description, styles["table_cell"]),
                _p(item.quantity, styles["table_right"]),
                _p(item.formatted_unit_price, styles["table_right"]),
                _p(item.formatted_total, styles["table_right"]),
            ]
        )

    table = LongTable(
        data,
        colWidths=[86 * mm, 15 * mm, 35 * mm, 35 * mm],
        repeatRows=1,
        hAlign="LEFT",
        splitByRow=1,
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), SURFACE),
                ("TEXTCOLOR", (0, 0), (-1, 0), INK),
                ("LINEBELOW", (0, 0), (-1, 0), 0.8, BORDER),
                ("LINEBELOW", (0, 1), (-1, -1), 0.4, BORDER),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return table


def _key_value_table(
    pairs: list[tuple[str, str]],
    styles: dict[str, ParagraphStyle],
    *,
    columns: int = 2,
) -> Table:
    cells = [
        [
            _p(label.upper(), styles["label"]),
            _p(value, styles["body"]),
        ]
        for label, value in pairs
    ]

    rows = []
    for index in range(0, len(cells), columns):
        row = []
        for cell in cells[index : index + columns]:
            row.extend(cell)
        while len(row) < columns * 2:
            row.extend(["", ""])
        rows.append(row)

    widths = [42 * mm, 43 * mm] * columns
    table = Table(rows, colWidths=widths, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return table


def _document_header(
    business_name: str | None,
    document_title: str,
    document_number: str,
    metadata: list[tuple[str, str]],
    styles: dict[str, ParagraphStyle],
):
    left = [
        _p(business_name or "Bagg", styles["business"]),
        _p(" ", styles["small"]),
    ]

    right = [
        _p(document_title.upper(), styles["title"]),
        _p(document_number, styles["total_value"]),
    ]

    for label, value in metadata:
        right.append(_p(f"{label}: {value}", styles["small"]))

    table = Table(
        [[left, right]],
        colWidths=[85 * mm, 85 * mm],
        hAlign="LEFT",
    )
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
                ("LINEBELOW", (0, 0), (-1, -1), 1.5, INK),
            ]
        )
    )
    return table


class _NumberedCanvas:
    """Placeholder retained for the renderer's public API.

    Page numbering is applied by the page callback below, avoiding a
    second pass over generated PDF pages.
    """


def _draw_page(canvas, document) -> None:
    canvas.saveState()
    page_number = canvas.getPageNumber()

    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(
        LEFT_MARGIN,
        15 * mm,
        PAGE_WIDTH - RIGHT_MARGIN,
        15 * mm,
    )

    regular, _ = _register_fonts()
    canvas.setFont(regular, 7)
    canvas.setFillColor(MUTED)
    canvas.drawString(LEFT_MARGIN, 10 * mm, "Generated with Bagg")
    canvas.drawRightString(
        PAGE_WIDTH - RIGHT_MARGIN,
        10 * mm,
        f"Page {page_number}",
    )
    canvas.restoreState()


class ReportLabDocumentRenderer:
    """Render typed Bagg document snapshots into immutable PDF bytes.

    This renderer performs no database access and no financial calculations.
    It only presents values already supplied by the document builders.
    """

    renderer_name = "reportlab"

    @property
    def renderer_version(self) -> str:
        from importlib.metadata import version

        return version("reportlab")

    def render(self, document: DocumentData) -> bytes:
        if isinstance(document, InvoiceDocument):
            story = self._invoice_story(document)
        elif isinstance(document, QuoteDocument):
            story = self._quote_story(document)
        elif isinstance(document, ReceiptDocument):
            story = self._receipt_story(document)
        else:
            raise TypeError(f"Unsupported document type: {type(document).__name__}")

        output = BytesIO()
        pdf = SimpleDocTemplate(
            output,
            pagesize=A4,
            rightMargin=RIGHT_MARGIN,
            leftMargin=LEFT_MARGIN,
            topMargin=TOP_MARGIN,
            bottomMargin=BOTTOM_MARGIN,
            title=self._title(document),
            author="Bagg",
            subject=f"Bagg {document.document_type} document",
            pageCompression=1,
        )
        pdf.build(
            story,
            onFirstPage=_draw_page,
            onLaterPages=_draw_page,
        )

        content = output.getvalue()
        if not content.startswith(b"%PDF-"):
            raise RuntimeError("ReportLab returned an invalid PDF document")

        return content

    @staticmethod
    def _title(document: DocumentData) -> str:
        if isinstance(document, InvoiceDocument):
            return f"Invoice {document.invoice_number}"
        if isinstance(document, QuoteDocument):
            return f"Quote {document.quote_number}"
        return f"Receipt {document.receipt_number}"

    def _invoice_story(self, document: InvoiceDocument) -> list:
        styles = _paragraph_styles()
        story = [
            _document_header(
                None,
                "Invoice",
                document.invoice_number,
                [
                    ("Issue date", document.formatted_issue_date),
                    ("Due date", document.formatted_due_date),
                ],
                styles,
            ),
            Spacer(1, 12 * mm),
            _line_items_table(document.items, styles),
            Spacer(1, 8 * mm),
            _totals_table(
                [
                    ("Subtotal", document.formatted_subtotal, False),
                    ("Tax", document.formatted_tax, False),
                    ("Total", document.formatted_total, True),
                    ("Withholding tax", document.formatted_wht, False),
                    ("Net payable", document.formatted_net_payable, True),
                ],
                styles,
            ),
        ]
        return story

    def _quote_story(self, document: QuoteDocument) -> list:
        styles = _paragraph_styles()
        metadata = [
            ("Quote number", document.quote_number),
            ("Version", str(document.version)),
            ("Issued", document.formatted_issue_date),
            ("Valid until", document.formatted_expires_at),
            ("Status", document.status.replace("_", " ").title()),
        ]

        story = [
            _document_header(
                document.business_name,
                "Quotation",
                document.quote_number,
                metadata,
                styles,
            ),
            Spacer(1, 8 * mm),
        ]

        business_details = []
        if document.business_address:
            business_details.append(("Business address", document.business_address))
        if document.business_tax_id:
            business_details.append(("Tax ID", document.business_tax_id))

        party_pairs = [
            ("Prepared for", document.client_name),
            ("Prepared by", document.business_name),
            *business_details,
        ]
        story.extend(
            [
                _key_value_table(party_pairs, styles),
                Spacer(1, 8 * mm),
                _line_items_table(document.items, styles),
                Spacer(1, 8 * mm),
            ]
        )

        totals = [
            ("Subtotal", document.formatted_subtotal, False),
            ("Discount", document.formatted_discount, False),
            (f"Tax ({document.formatted_tax_rate})", document.formatted_tax, False),
            ("Total", document.formatted_total, True),
        ]

        if document.wht_minor:
            totals.extend(
                [
                    (
                        f"WHT ({document.formatted_wht_rate})",
                        document.formatted_wht,
                        False,
                    ),
                    ("Net payable", document.formatted_net_payable, True),
                ]
            )

        if document.formatted_deposit:
            deposit_label = "Deposit"
            if document.formatted_deposit_percentage:
                deposit_label += f" ({document.formatted_deposit_percentage})"
            totals.append((deposit_label, document.formatted_deposit, False))

        story.append(_totals_table(totals, styles))

        if document.notes:
            story.extend(
                [
                    Spacer(1, 12 * mm),
                    HRFlowable(width="100%", thickness=0.6, color=BORDER),
                    Spacer(1, 4 * mm),
                    _p("NOTES AND TERMS", styles["label"]),
                    _p(document.notes, styles["body"]),
                ]
            )

        story.extend(
            [
                Spacer(1, 12 * mm),
                _p(
                    f"This quotation is valid until {document.formatted_expires_at}.",
                    styles["small"],
                ),
            ]
        )
        return story

    def _receipt_story(self, document: ReceiptDocument) -> list:
        styles = _paragraph_styles()

        story = [
            _document_header(
                document.business_name,
                "Payment receipt",
                document.receipt_number,
                [
                    ("Invoice", document.invoice_number),
                    ("Payment date", document.formatted_payment_date),
                ],
                styles,
            ),
            Spacer(1, 12 * mm),
            _key_value_table(
                [
                    ("Payer / Client", document.payer_name),
                    ("Payment method", document.payment_method),
                    ("Reference", document.reference),
                    (
                        "Remaining invoice balance",
                        document.formatted_balance_remaining,
                    ),
                ],
                styles,
            ),
            Spacer(1, 12 * mm),
        ]

        amount_box = Table(
            [
                [_p("AMOUNT RECEIVED", styles["label"])],
                [_p(document.formatted_amount_paid, styles["receipt_amount"])],
            ],
            colWidths=[150 * mm],
            hAlign="CENTER",
        )
        amount_box.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F0FDF4")),
                    ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#BBF7D0")),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("TOPPADDING", (0, 0), (-1, -1), 12),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
                ]
            )
        )
        story.extend(
            [
                amount_box,
                Spacer(1, 8 * mm),
                _p(document.confirmation_heading, styles["section"]),
                _p(document.confirmation_stamp, styles["label"]),
                _p(document.confirmation_disclaimer, styles["small"]),
                Spacer(1, 6 * mm),
                _p(
                    f"Verification code: {document.verification_code}",
                    styles["small"],
                ),
            ]
        )
        return story
