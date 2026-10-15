from typing import List, Optional
from pydantic import BaseModel, Field


class CreateSealRequest(BaseModel):
    candidate_id: str = Field(..., description="Unique candidate identifier")
    candidate_name: str = Field(..., description="Full candidate name")
    target_role: str = Field(..., description="Target job role")
    verified_tasks: List[str] = Field(
        default_factory=list, description="Titles or IDs of verified engineering tasks"
    )
    viva_marks: List[str] = Field(
        default_factory=list, description="Recruiter/AI marks for viva questions"
    )
    github_url: Optional[str] = Field(default=None, description="Optional verified GitHub URL")
    verified_skills: Optional[List[str]] = Field(
        default=None, description="Skills verified through proof-of-work and viva"
    )
    day_zero_score: Optional[int] = Field(
        default=None, description="Calculated Day-Zero readiness score"
    )


class AuthorshipSealData(BaseModel):
    verification_id: str
    content_hash: str
    timestamp: str
    algorithm: str = "SHA-256"
    candidate_name: str
    target_role: str
    status: str = "VERIFIED"
    audit_summary: str


class VerificationLookupData(BaseModel):
    verification_id: str
    content_hash: str
    timestamp: str
    algorithm: str = "SHA-256"
    candidate_name: str
    target_role: str
    status: str = "VERIFIED"
    verified_skills: List[str] = Field(default_factory=list)
    verified_tasks: List[str] = Field(default_factory=list)
    viva_marks: List[str] = Field(default_factory=list)
    day_zero_score: int = 86
    audit_summary: str

