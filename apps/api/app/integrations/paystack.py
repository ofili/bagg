class PaystackClient:
    """Paystack integration client for Phase 1 automated payment collection."""
    async def initialize_payment(self, amount_minor: int, email: str, reference: str):
        return {
            "authorization_url": f"https://checkout.paystack.com/demo-{reference}",
            "reference": reference,
        }
