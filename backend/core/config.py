from enum import Enum
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class EnvironmentType(str, Enum):
    DEVELOPMENT = "development"
    PRODUCTION = "production"
    TEST = "test"


class BaseConfig(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


class Config(BaseConfig):
    DEBUG: int = 0
    DEFAULT_LOCALE: str = "en_US"
    ENVIRONMENT: str = EnvironmentType.DEVELOPMENT
    RELEASE_VERSION: str = "0.1"

    # LLM Settings
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash-lite"

    # Cryptography & Signing
    SERVER_SIGNING_KEY: str = "talentforge-secret-signing-key-production-2026"

    # GitHub Forensics & Rate Limits
    GITHUB_TOKEN: str = ""
    DEMO_OFFLINE_CACHE: bool = True

    # Security & CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://talentforge.alqatech.in",
    ]

    # Rate Limiting
    RATE_LIMIT_GLOBAL: str = "30/minute"
    RATE_LIMIT_LLM: str = "10/minute"
    RATE_LIMIT_GITHUB: str = "5/minute"


config: Config = Config()
