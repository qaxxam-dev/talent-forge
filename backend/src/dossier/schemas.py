from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from src.intake.schemas import SkillGap


class BusinessImpact(BaseModel):
    technical_deliverable: str = Field(..., description="What the candidate demonstrated/built")
    commercial_value: str = Field(..., description="Revenue, velocity, or operational business value")
    risk_mitigated: str = Field(..., description="Architecture or delivery risk prevented")


class AuthorshipSealRef(BaseModel):
    verification_id: str
    content_hash: str
    timestamp: str


class GenerateDossierRequest(BaseModel):
    candidate_id: str = Field(..., description="Unique candidate identifier")
    candidate_name: str = Field(..., description="Candidate name")
    target_role: str = Field(..., description="Target role evaluated")
    match_percentage: int = Field(default=80, ge=0, le=100)
    verified_tasks: List[str] = Field(default_factory=list)
    viva_marks: List[str] = Field(default_factory=list)
    remaining_gaps: List[SkillGap] = Field(default_factory=list)
    seal: Optional[AuthorshipSealRef] = Field(default=None)


class VerificationDossierData(BaseModel):
    candidate_label: str
    role: str
    day_zero_score: int = Field(ge=0, le=100)
    seal: AuthorshipSealRef
    impacts: List[BusinessImpact]
    remaining_gaps: List[SkillGap]
    generated_at: str
    executive_summary: str
    ats_export_payload: Dict[str, Any]
