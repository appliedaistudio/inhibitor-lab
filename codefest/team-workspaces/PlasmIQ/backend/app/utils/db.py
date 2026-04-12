from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

mongodb_client = None
mongodb_db = None


async def connect_to_mongo():
    """Connect to MongoDB."""
    global mongodb_client, mongodb_db
    mongodb_client = AsyncIOMotorClient(settings.mongodb_url)
    mongodb_db = mongodb_client[settings.mongodb_db]
    print("Connected to MongoDB")


async def close_mongo_connection():
    """Close MongoDB connection."""
    global mongodb_client
    if mongodb_client:
        mongodb_client.close()
        print("Closed MongoDB connection")


def get_database():
    """Get MongoDB database instance."""
    return mongodb_db
