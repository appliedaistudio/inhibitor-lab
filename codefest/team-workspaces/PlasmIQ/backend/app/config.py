import os
from pydantic import Field, AliasChoices
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    # Inhibitor API
    inhibitor_api_key: str = ""
    inhibitor_base_url: str = "https://iaas.appliedai.studio"

    # OpenAI Configuration
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"

    # Weather API
    openweather_api_key: str = ""
    openweather_base_url: str = "https://api.openweathermap.org/data/2.5"

    # Google Maps
    google_maps_api_key: str = ""

    # MongoDB — accepts MONGODB_URL or MONGODB_URI, DB_NAME or MONGODB_DB
    mongodb_url: str = Field(
        default="mongodb://localhost:27017",
        validation_alias=AliasChoices("mongodb_url", "mongodb_uri"),
    )
    mongodb_db: str = Field(
        default="plasmiq",
        validation_alias=AliasChoices("mongodb_db", "db_name"),
    )

    # JWT Auth
    jwt_secret: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 10080  # 7 days

    # Admin
    admin_secret: str = "plasmiq-admin-2026"

    # Application
    debug: bool = False
    environment: str = "development"

    # Appointment Constraints
    max_appointments_per_week: int = 2
    rest_days_between_donations: int = 1

    class Config:
        env_file = ".env"
        extra = "ignore"
        case_sensitive = False


settings = Settings()
