class FlutterwaveClient:
    """Flutterwave integration client for Phase 1 automated payment collection."""
    async def initialize_payment(self, amount_minor: int, currency: str, email: str, tx_ref: str):
        return {
            "link": f"https://checkout.flutterwave.com/demo-{tx_ref}",
            "tx_ref": tx_ref
        }
