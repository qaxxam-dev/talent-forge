from fastapi import APIRouter, File, Request, UploadFile

from core.config import config
from core.rate_limiter import limiter
from core.schemas import APIResponse
from src.intake.schemas import (
    BatchIntakeRequest,
    BatchIntakeResponseData,
    IntakeRequest,
    IntakeResponseData,
    ParseResumeResponseData,
)
from src.intake.service import intake_service

router = APIRouter(prefix="/v1", tags=["Intake"])


@router.post("/parse-resume", response_model=APIResponse[ParseResumeResponseData])
@limiter.limit(config.RATE_LIMIT_GLOBAL)
async def parse_resume_endpoint(
    request: Request,
    file: UploadFile = File(...),
) -> APIResponse[ParseResumeResponseData]:
    file_bytes = await file.read()
    data = intake_service.parse_resume_file(file.filename or "resume.txt", file_bytes)
    return APIResponse(
        success=True,
        data=data,
        error=None,
        meta={"file_name": file.filename, "size_bytes": len(file_bytes)},
    )


@router.post("/intake", response_model=APIResponse[IntakeResponseData])
@limiter.limit(config.RATE_LIMIT_LLM)
async def intake_endpoint(
    request: Request,
    body: IntakeRequest,
) -> APIResponse[IntakeResponseData]:
    data, meta = await intake_service.process_intake(body)
    return APIResponse(
        success=True,
        data=data,
        error=None,
        meta=meta,
    )


@router.post("/batch-intake", response_model=APIResponse[BatchIntakeResponseData])
@limiter.limit(config.RATE_LIMIT_LLM)
async def batch_intake_endpoint(
    request: Request,
    body: BatchIntakeRequest,
) -> APIResponse[BatchIntakeResponseData]:
    data, meta = await intake_service.process_batch_intake(body)
    return APIResponse(
        success=True,
        data=data,
        error=None,
        meta=meta,
    )
