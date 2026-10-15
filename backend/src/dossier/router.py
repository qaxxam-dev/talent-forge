from fastapi import APIRouter, Request

from core.config import config
from core.rate_limiter import limiter
from core.schemas import APIResponse
from src.dossier.schemas import GenerateDossierRequest, VerificationDossierData
from src.dossier.service import dossier_service

router = APIRouter(prefix="/v1", tags=["Verification Dossier"])


@router.post("/generate-dossier", response_model=APIResponse[VerificationDossierData])
@limiter.limit(config.RATE_LIMIT_LLM)
async def generate_dossier_endpoint(
    request: Request,
    body: GenerateDossierRequest,
) -> APIResponse[VerificationDossierData]:
    data, meta = await dossier_service.generate_dossier(body)
    return APIResponse(
        success=True,
        data=data,
        error=None,
        meta=meta,
    )
