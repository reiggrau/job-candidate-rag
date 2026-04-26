"""Configuration settings for the application."""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).parent.parent / ".env"


class Settings(BaseSettings):
    """Configuration settings loaded from environment variables."""
    openai_api_key: str
    qdrant_url: str = "http://localhost:6333"
    qdrant_collection: str = "candidates"
    jobs_collection: str = "jobs"
    embedding_model: str = "text-embedding-3-large"
    llm_model: str = "gpt-4.1"

    # Ignore extra fields in the .env file
    model_config = SettingsConfigDict(env_file=_ENV_FILE, extra="ignore")


settings = Settings()
