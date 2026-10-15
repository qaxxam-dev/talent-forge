from fastapi import APIRouter, Request

from core.config import config
from core.rate_limiter import limiter
from core.schemas import APIResponse
from src.seal.schemas import AuthorshipSealData, CreateSealRequest, VerificationLookupData
from src.seal.service import seal_service

router = APIRouter(prefix="/v1", tags=["Authorship Seal"])


@router.post("/create-seal", response_model=APIResponse[AuthorshipSealData])
@limiter.limit(config.RATE_LIMIT_LLM)
async def create_seal_endpoint(
    request: Request,
    body: CreateSealRequest,
) -> APIResponse[AuthorshipSealData]:
    data, meta = seal_service.generate_seal(body)
    return APIResponse(
        success=True,
        data=data,
        error=None,
        meta=meta,
    )


@router.get("/verify/{verification_id}", response_model=APIResponse[VerificationLookupData])
@limiter.limit(config.RATE_LIMIT_LLM)
async def verify_lookup_endpoint(
    request: Request,
    verification_id: str,
) -> APIResponse[VerificationLookupData]:
    record = seal_service.get_verification(verification_id)
    if not record:
        return APIResponse(
            success=False,
            data=None,
            error=f"No verification record found for ID: {verification_id}",
            meta={"verification_id": verification_id},
        )
    return APIResponse(
        success=True,
        data=record,
        error=None,
        meta={"verified": True, "verification_id": verification_id},
    )


