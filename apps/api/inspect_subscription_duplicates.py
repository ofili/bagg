import asyncio
from sqlalchemy import text
from app.core.database import engine

async def main():
    async with engine.connect() as connection:
        result = await connection.execute(text("""
            SELECT
                processor,
                processor_subscription_code,
                COUNT(*) AS duplicate_count,
                ARRAY_AGG(id::text) AS subscription_ids,
                ARRAY_AGG(workspace_id::text) AS workspace_ids
            FROM subscriptions
            WHERE processor_subscription_code IS NOT NULL
            GROUP BY processor, processor_subscription_code
            HAVING COUNT(*) > 1
        """))

        rows = result.mappings().all()

        if not rows:
            print("No duplicate subscription codes found.")
        else:
            for row in rows:
                print(dict(row))

    await engine.dispose()

asyncio.run(main())
