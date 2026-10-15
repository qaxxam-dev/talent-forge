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


class ChallengeIdea(BaseModel):
    id: str = Field(..., description="Unique slug or identifier (e.g. fintech-ledger)")
    title: str = Field(..., description="Action-oriented title of the challenge")
    tagline: str = Field(..., description="Short 1-sentence hook or overview")
    problem_statement: str = Field(
        ...,
        description="Detailed business problem scenario explaining what the candidate must build and the core technical dilemma",
    )
    tech_stack_focus: str = Field(
        ...,
        description="Suggested tech stack and libraries (e.g. FastAPI, PostgreSQL, Redis)",
    )
    targeted_skills: List[str] = Field(
        default_factory=list, description="Targeted competencies or skill gaps addressed"
    )


class GenerateChallengeIdeasRequest(BaseModel):
    role_title: Optional[str] = Field(
        default="Senior Technical Candidate", description="Target role title"
    )
    job_description: Optional[str] = Field(
        default=None, description="Job requirements or role competency framework"
    )
    skill_gap_analysis: Optional[SkillGapAnalysis] = Field(
        default=None, description="Skill gap analysis produced during Screen 1 intake"
    )


class GenerateChallengeIdeasResponseData(BaseModel):
    ideas: List[ChallengeIdea]


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


class VerifyTicketRequest(BaseModel):
    task_id: str = Field(..., description="ID of the task being verified")
    task_title: str = Field(..., description="Title of the task")
    acceptance_criteria: str = Field(..., description="Acceptance criteria of the task")
    suggested_path: str = Field(..., description="Target file path of the task")
    code_content: str = Field(..., description="Candidate submitted source code or PR diff")
    pr_url: Optional[str] = Field(default=None, description="Optional PR or commit URL")


class VerifyTicketResponseData(BaseModel):
    task_id: str
    is_verified: bool
    status: Literal["verified", "rejected"]
    verification_score: int = Field(ge=0, le=100, description="Confidence score 0-100")
    rubric_feedback: str = Field(..., description="Forensic audit feedback against acceptance criteria")
    strengths: List[str] = Field(default_factory=list)
    shortcomings: List[str] = Field(default_factory=list)
    verified_code_snippet: str = Field(..., description="Locked code snippet for viva defense")
