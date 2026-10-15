from typing import List, Literal, Optional
from pydantic import BaseModel, Field

from src.intake.schemas import SkillGapAnalysis


class ProjectChallenge(BaseModel):
    title: str = Field(
        ..., description="Name or title of the engineering challenge (e.g. Fintech Ledger Engine)"
    )
    problem_statement: str = Field(
        ...,
        description="Concrete business problem scenario explaining what the candidate must build",
    )
    tech_stack_focus: Optional[str] = Field(
        default=None,
        description="Key frameworks and libraries to focus on (e.g. Python, FastAPI, PostgreSQL, Redis)",
    )


class PreVerifiedSource(BaseModel):
    verification_id: Optional[str] = None
    verified_at: Optional[str] = None
    role: Optional[str] = None
    matched_skills: Optional[List[str]] = None


class TaskItem(BaseModel):
    id: str = Field(..., description="Unique ticket ID (e.g. TF-SPRINT1-01)")
    sprint: int = Field(
        ...,
        ge=1,
        le=3,
        description="1 = Schema & Models, 2 = APIs & Controllers, 3 = Deploy & Testing",
    )
    title: str = Field(..., description="Action-oriented engineering task title")
    description: str = Field(
        ..., description="Short context on why this task is needed and what to implement"
    )
    estimated_hours: int = Field(..., ge=1, le=24, description="Realistic engineering hours")
    acceptance_criteria: str = Field(
        ...,
        description="2-3 concrete bulleted verification signals (schema checks, edge cases, contracts)",
    )
    suggested_path: str = Field(
        ..., description="Suggested repository file path (e.g. src/models/ledger.py)"
    )
    status: Literal["open", "assigned", "verified", "pre_verified"] = Field(
        default="open", description="Ticket state: open, assigned, verified, pre_verified"
    )
    notes: Optional[str] = Field(
        default=None, description="Optional recruiter notes, PR link, or commit verification notes"
    )
    pre_verified_source: Optional[PreVerifiedSource] = Field(
        default=None, description="Details of prior verification if pre-verified"
    )


class PriorVerificationInput(BaseModel):
    verification_id: str
    verified_at: Optional[str] = None
    candidate_name: Optional[str] = None
    target_role: Optional[str] = None
    verified_skills: List[str] = Field(default_factory=list)
    verified_deliverables: List[str] = Field(default_factory=list)


class GenerateSpecRequest(BaseModel):
    skill_gap_analysis: SkillGapAnalysis = Field(
        ..., description="Skill gap analysis produced during Screen 1 intake"
    )
    role_title: str = Field(
        default="Senior Backend Engineer", description="Target role title"
    )
    job_description: str = Field(
        ..., description="Job requirements or role competency framework"
    )
    project_challenge: Optional[ProjectChallenge] = Field(
        default=None,
        description="Optional project challenge scenario; if omitted, inferred from the JD",
    )
    prior_verification: Optional[PriorVerificationInput] = Field(
        default=None,
        description="Optional pre-existing verification record to auto-mark pre-verified skills",
    )



class GenerateSpecResponseData(BaseModel):
    project_challenge: ProjectChallenge
    tasks: List[TaskItem]
    evidence_summary: str = Field(
        ...,
        description="Synthesized summary of technical deliverables used to seed Oral Viva questions",
    )
