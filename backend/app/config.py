from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    alpha_vantage_api_key: str = "demo"
    cache_ttl_seconds: int = 3600
    rate_limit: str = "30/minute"
    allowed_origins: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()