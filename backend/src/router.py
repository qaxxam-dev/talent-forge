from fastapi import APIRouter

from src.intake import router as intake_router
from src.kanban import router as kanban_router
from src.viva import router as viva_router
from src.seal import router as seal_router
from src.dossier import router as dossier_router
from src.repo import router as repo_router

api_router = APIRouter()

# Health check endpoint
@api_router.get("/health", tags=["Health"])
@api_router.get("/v1/health", tags=["Health"])
async def health_check():
    return {"status": "ok"}


# Mount feature routers
api_router.include_router(intake_router)
api_router.include_router(kanban_router)
api_router.include_router(viva_router)
api_router.include_router(seal_router)
api_router.include_router(dossier_router)
api_router.include_router(repo_router)

