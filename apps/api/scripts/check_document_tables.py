import asyncio

from sqlalchemy import inspect
from app.core.database import engine


async def main():
    async with engine.connect() as connection:
        tables = await connection.run_sync(
            lambda sync_connection: inspect(sync_connection).get_table_names()
        )

        print("document_artifacts:", "document_artifacts" in tables)
        print("document_generation_jobs:", "document_generation_jobs" in tables)


if __name__ == "__main__":
    asyncio.run(main())
