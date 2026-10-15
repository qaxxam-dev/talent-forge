from fastapi import APIRouter, Request

from core.config import config
from core.rate_limiter import limiter
from core.schemas import APIResponse
from src.kanban.schemas import (
    GenerateSpecRequest,
    GenerateSpecResponseData,
    VerifyTicketRequest,
    VerifyTicketResponseData,
)
from src.kanban.service import kanban_service

router = APIRouter(prefix="/v1", tags=["Kanban"])


@router.post("/generate-spec", response_model=APIResponse[GenerateSpecResponseData])
@limiter.limit(config.RATE_LIMIT_LLM)
async def generate_spec_endpoint(
    request: Request,
    body: GenerateSpecRequest,
) -> APIResponse[GenerateSpecResponseData]:
    data, meta = await kanban_service.generate_spec(body)
    return APIResponse(
        success=True,
        data=data,
        error=None,
        meta=meta,
    )


@router.post("/verify-ticket", response_model=APIResponse[VerifyTicketResponseData])
@limiter.limit(config.RATE_LIMIT_LLM)
async def verify_ticket_endpoint(
    request: Request,
    body: VerifyTicketRequest,
) -> APIResponse[VerifyTicketResponseData]:
    data, meta = await kanban_service.verify_ticket(body)
    return APIResponse(
        success=True,
        data=data,
        error=None,
        meta=meta,
    )
