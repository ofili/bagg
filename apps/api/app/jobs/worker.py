import asyncio
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("bagg-worker")

async def main():
    logger.info("Bagg background job worker started. Listening for reminders and PDF jobs...")
    while True:
        await asyncio.sleep(60)

if __name__ == "__main__":
    asyncio.run(main())
