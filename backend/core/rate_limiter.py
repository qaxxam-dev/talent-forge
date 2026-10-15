from slowapi import Limiter
from slowapi.util import get_remote_address

from core.config import config

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[config.RATE_LIMIT_GLOBAL],
)
