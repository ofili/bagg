import asyncio
from sqlalchemy import text
from app.core.database import engine


async def main():
    async with engine.connect() as connection:
        result = await connection.execute(text("""
            SELECT
                id,
                workspace_id,
                tier,
                status,
                plan_code,
                processor,
                processor_subscription_code,
                processor_customer_code,
                created_at,
                updated_at
            FROM subscriptions
            WHERE processor = 'paystack'
              AND processor_subscription_code = 'SUB_DEMO_001'
            ORDER BY created_at
        """))

        for row in result.mappings():
            print(dict(row))

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
