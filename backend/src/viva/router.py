from fastapi import APIRouter, Request

from core.config import config
from core.rate_limiter import limiter
from core.schemas import APIResponse
from src.viva.schemas import (
    EvaluateDefenseRequest,
    EvaluateDefenseResponseData,
    GenerateVivaRequest,
    GenerateVivaResponseData,
)
from src.viva.service import viva_service

router = APIRouter(prefix="/v1", tags=["Viva Defense"])


@router.post("/generate-viva", response_model=APIResponse[GenerateVivaResponseData])
@limiter.limit(config.RATE_LIMIT_LLM)
async def generate_viva_endpoint(
    request: Request,
    body: GenerateVivaRequest,
) -> APIResponse[GenerateVivaResponseData]:
    data, meta = await viva_service.generate_viva(body)
    return APIResponse(
        success=True,
        data=data,
        error=None,
        meta=meta,
    )


@router.post("/evaluate-defense", response_model=APIResponse[EvaluateDefenseResponseData])
@limiter.limit(config.RATE_LIMIT_LLM)
async def evaluate_defense_endpoint(
    request: Request,
    body: EvaluateDefenseRequest,
) -> APIResponse[EvaluateDefenseResponseData]:
    data, meta = await viva_service.evaluate_defense(body)
    return APIResponse(
        success=True,
        data=data,
        error=None,
        meta=meta,
    )
