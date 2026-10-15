from typing import List

from fastapi import Depends, FastAPI, Request
from fastapi.middleware import Middleware
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from core.config import config
from core.exceptions import CustomException
from core.fastapi.dependencies import Logging
from core.fastapi.middlewares import ResponseLoggerMiddleware
from core.rate_limiter import limiter
from src.router import api_router


def init_routers(app_: FastAPI) -> None:
    app_.include_router(api_router)


def init_listeners(app_: FastAPI) -> None:
    @app_.exception_handler(CustomException)
    async def custom_exception_handler(request: Request, exc: CustomException):
        return JSONResponse(
            status_code=int(exc.code),
            content={
                "success": False,
                "data": None,
                "error": exc.message,
                "meta": None,
            },
        )

    @app_.exception_handler(RateLimitExceeded)
    async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
        return JSONResponse(
            status_code=429,
            content={
                "success": False,
                "data": None,
                "error": f"Rate limit exceeded: {exc.detail}",
                "meta": None,
            },
            headers={"Retry-After": "60"},
        )


def make_middleware() -> List[Middleware]:
    origins = config.ALLOWED_ORIGINS
    # If wildcard in allowed origins, allow all origins
    if "*" in origins:
        allow_origins = ["*"]
    else:
        allow_origins = origins

    middleware = [
        Middleware(
            CORSMiddleware,
            allow_origins=allow_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        ),
        Middleware(ResponseLoggerMiddleware),
    ]
    return middleware


def create_app() -> FastAPI:
    app_ = FastAPI(
        title="TalentForge Backend API",
        description="Technical Verification Infrastructure for Existing Hiring Platforms",
        version=config.RELEASE_VERSION,
        docs_url=None if config.ENVIRONMENT == "production" else "/docs",
        redoc_url=None if config.ENVIRONMENT == "production" else "/redoc",
        dependencies=[Depends(Logging)],
        middleware=make_middleware(),
    )
    app_.state.limiter = limiter
    init_routers(app_=app_)
    init_listeners(app_=app_)
    return app_


app = create_app()
