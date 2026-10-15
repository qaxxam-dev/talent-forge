from fastapi import APIRouter, Request

from core.config import config
from core.rate_limiter import limiter
from core.schemas import APIResponse
from src.repo.schemas import AnalyzeRepoRequest, AnalyzeRepoResponseData
from src.repo.service import repo_service

router = APIRouter(prefix="/v1", tags=["Repository Audit"])


@router.post("/analyze-repo", response_model=APIResponse[AnalyzeRepoResponseData])
@limiter.limit(config.RATE_LIMIT_LLM)
async def analyze_repo_endpoint(
    request: Request,
    body: AnalyzeRepoRequest,
) -> APIResponse[AnalyzeRepoResponseData]:
    data, meta = await repo_service.analyze_repo(body)
    return APIResponse(
        success=True,
        data=data,
        error=None,
        meta=meta,
    )
