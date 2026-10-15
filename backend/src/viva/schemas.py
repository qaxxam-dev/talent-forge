from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class RubricItem(BaseModel):
    id: str = Field(..., description="Unique rubric item ID (e.g. RUBRIC-01)")
    text: str = Field(..., description="Concrete criteria the answer should address")
    expected_signal: str = Field(
        ...,
        description="Specific technical signal (e.g. mentions ACID properties, explains idempotency key, discusses circuit breaker pattern)",
    )


class VivaQuestion(BaseModel):
    id: str = Field(..., description="Unique question identifier (e.g. TF-VIVA-Q1)")
    question_text: str = Field(
        ...,
        description="Targeted technical question forcing defense of specific implementation choices",
    )
    referenced_artifact: str = Field(
        ...,
        description="Name of ticket, file, or architectural component claimed by the candidate",
    )
    question_type: Literal[
        "architectural", "tradeoff", "requirement_mutation", "adaptive_followup"
    ] = Field(..., description="Type of viva inquiry")
    rubric: List[RubricItem] = Field(
        ...,
        min_length=2,
        max_length=3,
        description="2-3 key technical rubric criteria a strong engineer must hit",
    )


class GenerateVivaRequest(BaseModel):
    role_title: str = Field(
        default="Senior Backend Engineer", description="Target role title"
    )
    job_description: Optional[str] = Field(
        default=None, description="Target job requirements or competency framework"
    )
    evidence_summary: str = Field(
        ...,
        description="Summary of verified engineering artifacts from Kanban or Repo Analysis",
    )
    claimed_artifacts: List[str] = Field(
        ...,
        min_length=1,
        description="Concrete tickets, files, or deliverables the candidate completed/verified",
    )


class GenerateVivaResponseData(BaseModel):
    questions: List[VivaQuestion] = Field(
        ...,
        description="Targeted viva questions (Q1: Architectural Deep Dive, Q2: Failure/Edge Case, Q3: Requirement Mutation)",
    )
    defense_guidance: str = Field(
        ...,
        description="Quick tip for recruiter on what to listen for during live candidate defense",
    )


class RubricCheck(BaseModel):
    rubric_id: str = Field(..., description="Referenced RubricItem id")
    criterion: str = Field(..., description="Text of the rubric requirement")
    hit: bool = Field(..., description="True if the transcript covered this criterion")
    citation: str = Field(
        ...,
        description="Direct quote or explanation of how the candidate addressed/missed the point",
    )


class EvaluateDefenseRequest(BaseModel):
    question: VivaQuestion = Field(
        ..., description="The VivaQuestion that was presented to the candidate"
    )
    transcript: str = Field(
        ..., description="Spoken or typed transcript provided by the candidate"
    )
    delivery_mode: Literal["voice", "typed_fallback"] = Field(
        default="voice", description="Delivery channel used by candidate"
    )
    recruiter_mark: Optional[Literal["adequate", "weak", "none"]] = Field(
        default=None, description="Optional preliminary recruiter mark"
    )
    is_final_question: bool = Field(
        default=False,
        description="If true, indicates Q3 or final round where no dynamic follow-up is generated",
    )
    previous_turns: Optional[List[Dict[str, Any]]] = Field(
        default=None, description="Optional history of previous questions & answers"
    )


class EvaluateDefenseResponseData(BaseModel):
    question_id: str = Field(..., description="ID of evaluated question")
    score: int = Field(
        ...,
        ge=1,
        le=5,
        description="Depth score: 1 (no clue) to 5 (production mastery)",
    )
    suggested_mark: Literal["adequate", "weak", "none"] = Field(
        ...,
        description="Recommended mark based on rubric coverage: adequate, weak, or none",
    )
    rationale: str = Field(
        ...,
        description="Concise rationale explaining what was hit and what was missed",
    )
    rubric_coverage: List[RubricCheck] = Field(
        ..., description="Evaluation of each rubric point against the transcript"
    )
    dynamic_follow_up: Optional[VivaQuestion] = Field(
        default=None,
        description="Adaptive follow-up question generated from transcript (null if final question)",
    )
