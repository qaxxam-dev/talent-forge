from typing import List, Literal, Optional
from pydantic import BaseModel, Field

from core.pii import RedactedToken


class SkillGap(BaseModel):
    name: str = Field(description="Name of the skill or technical concept")
    severity: Literal["critical", "high", "medium"] = Field(
        description="Severity level of the missing skill relative to job requirements"
    )
    explanation: str = Field(
        description="Short concrete explanation of why this gap matters for the role"
    )


class SkillGapAnalysis(BaseModel):
    match_percentage: int = Field(
        ge=0, le=100, description="Estimated match percentage from 0 to 100"
    )
    acquired_skills: List[str] = Field(
        default_factory=list, description="Skills verified with concrete project context"
    )
    unsubstantiated_claims: List[str] = Field(
        default_factory=list, description="Keywords or tools claimed without verifiable project evidence"
    )
    critical_gaps: List[SkillGap] = Field(
        default_factory=list, description="Critical missing capabilities"
    )
    high_gaps: List[SkillGap] = Field(
        default_factory=list, description="High-priority missing capabilities or unproven claims"
    )
    authenticity_notes: Optional[str] = Field(
        default=None, description="Forensic note on evidence depth vs buzzwords"
    )


class ParseResumeResponseData(BaseModel):
    raw_text: str
    detected_name: Optional[str] = None
    detected_email: Optional[str] = None
    detected_phone: Optional[str] = None
    detected_github: Optional[str] = None
    file_name: str
    word_count: int


class IntakeRequest(BaseModel):
    resume_text: str = Field(..., description="Raw resume text or profile content")
    job_description: str = Field(..., description="Target job requirements")
    candidate_name: Optional[str] = Field(default=None, description="Optional name for redaction")
    location: Optional[str] = Field(default=None, description="Optional location for redaction")
    github_url: Optional[str] = Field(default=None, description="Optional public GitHub repo URL")


class IntakeResponseData(BaseModel):
    sanitized_resume: str
    redacted_fields: List[RedactedToken]
    skill_gap_analysis: SkillGapAnalysis
    suggested_path: Literal["kanban", "repo"]


class BatchCandidateInput(BaseModel):
    id: str = Field(..., description="Unique candidate identifier")
    name: Optional[str] = Field(default=None, description="Candidate name")
    email: Optional[str] = Field(default=None, description="Candidate email")
    location: Optional[str] = Field(default=None, description="Candidate location")
    resume_text: str = Field(..., description="Resume text or profile content")
    github_url: Optional[str] = Field(default=None, description="Optional GitHub repo URL")


class BatchCandidateOutput(BaseModel):
    id: str
    name: str
    sanitized_name: str
    email_masked: str
    match_percentage: int = Field(ge=0, le=100)
    acquired_skills: List[str] = Field(default_factory=list)
    critical_gaps: List[SkillGap] = Field(default_factory=list)
    high_gaps: List[SkillGap] = Field(default_factory=list)
    suggested_shortlist: bool = False
    sanitized_resume: str
    raw_resume: str
    location: Optional[str] = None
    github_url: Optional[str] = None
    suggested_path: Literal["kanban", "repo"] = "kanban"


class BatchIntakeRequest(BaseModel):
    job_description: str = Field(..., description="Target role requirements")
    candidates: List[BatchCandidateInput] = Field(
        default_factory=list, description="List of candidates for batch evaluation"
    )
    use_campus_drive_preset: bool = Field(
        default=False,
        description="Load realistic 15-candidate campus drive dataset for instant demo ranking",
    )


class BatchIntakeResponseData(BaseModel):
    job_description: str
    total_processed: int
    shortlist_count: int
    candidates: List[BatchCandidateOutput]
