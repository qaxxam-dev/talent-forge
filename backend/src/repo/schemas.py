from typing import List, Literal, Optional
from pydantic import BaseModel, Field

from src.intake.schemas import SkillGap


class RepoFileHighlight(BaseModel):
    path: str = Field(..., description="File path relative to repository root")
    language: str = Field(..., description="Programming language of the file")
    relevance_explanation: str = Field(
        ..., description="Why this file serves as evidence for candidate skills or gaps"
    )
    code_snippet: Optional[str] = Field(
        default=None, description="Key representative snippet for viva inspection"
    )


class AnalyzeRepoRequest(BaseModel):
    github_url: str = Field(..., description="Public GitHub repository URL")
    job_description: Optional[str] = Field(
        default=None, description="Job description to evaluate relevance against"
    )
    candidate_name: Optional[str] = Field(default=None, description="Candidate name")
    critical_gaps: Optional[List[SkillGap]] = Field(
        default=None, description="Known skill gaps to check against repository contents"
    )


class AnalyzeRepoResponseData(BaseModel):
    repo_name: str
    owner: str
    stars: int
    primary_language: str
    has_sufficient_signal: bool
    recommended_path: Literal["repo", "kanban"]
    confidence_score: int = Field(ge=0, le=100)
    reasoning: str
    key_files: List[RepoFileHighlight]
    evidence_summary: str
    github_url: str
