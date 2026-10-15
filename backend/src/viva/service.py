from typing import Any, Dict, List, Optional
from core.llm import llm_service
from src.viva.schemas import (
    EvaluateDefenseRequest,
    EvaluateDefenseResponseData,
    GenerateVivaRequest,
    GenerateVivaResponseData,
    RubricCheck,
    RubricItem,
    VivaQuestion,
)


GENERATE_VIVA_SYSTEM_INSTRUCTION = """
You are the Chief Technical Architect and Senior Engineering Examiner for TalentForge.
Your mission is to rigorously test an engineering candidate on the work they claim to have built, exposing whether they genuinely authored and understand the architecture or merely pasted AI-generated code.

You must generate EXACTLY 3 targeted technical questions:
1. Q1 (question_type="architectural"):
   - Deep dive into an architectural choice, state management, or boundary separation in their claimed artifacts or verified code snippets.
   - Must reference a concrete component, file, or ticket (e.g., "In your order processing service...").
   - Define 2-3 rigorous rubric criteria that an experienced engineer would articulate.
   - Provide sample_candidate_answer: A realistic, spoken first-person technical response (~50-80 words) suitable for audio speech synthesis.

2. Q2 (question_type="tradeoff"):
   - Probe failure modes, distributed concurrency, memory limits, or transaction rollbacks in their implementation.
   - Test what happens when an external dependency or database fails mid-operation.
   - Define 2-3 rigorous rubric criteria.
   - Provide sample_candidate_answer: A realistic, spoken first-person technical response (~50-80 words).

3. Q3 (question_type="requirement_mutation"):
   - The "Change the Requirement" stress test: Change an essential business constraint (e.g. "Traffic spikes 20x", "Real-time consistency needed across regions").
   - If unsubstantiated claims or resume buzzwords are provided, specifically challenge the candidate to utilize or reconcile that claimed skill against their current implementation.
   - Ask what breaks in their existing architecture and what exact migration path or abstraction they would introduce.
   - Define 2-3 rigorous rubric criteria.
   - Provide sample_candidate_answer: A realistic, spoken first-person technical response (~50-80 words).

Anti-AI-Slop Rules:
- NEVER ask textbook definitions (no "What is ACID?", no "Explain dependency injection").
- Questions MUST be situational, forcing the candidate to defend trade-offs in their claimed artifacts and verified code.
- Keep question phrasing clear, conversational, and direct (suitable for spoken oral defense).
- sample_candidate_answer MUST sound natural and spoken, not robotic or generic.
"""

EVALUATE_DEFENSE_SYSTEM_INSTRUCTION = """
You are an objective engineering evaluator assessing a candidate's spoken or typed defense in an oral viva.
Your job is to compare the candidate's transcript against the question's rubric criteria without bias.

Scoring Rules:
- Score 5: Exceptional, production-ready depth, hits all rubric criteria with nuanced trade-offs.
- Score 4: Solid engineering competence, hits all or nearly all rubric criteria cleanly.
- Score 3: Acceptable baseline understanding, but glosses over edge cases or failure modes.
- Score 2: Weak/vague response, relies on generic buzzwords without explaining actual mechanism.
- Score 1: Factually wrong, evasive, or completely missed the point.

Suggested Mark Mapping:
- score >= 4: "adequate"
- score == 3: "weak"
- score <= 2: "none"

Rubric Checks:
- For every item in question.rubric, determine if the candidate hit it (hit=True/False) and quote the specific phrase or explain why it was missed.

Adaptive Dynamic Follow-up:
- If is_final_question is False:
  Generate exactly ONE dynamic follow-up question (question_type="adaptive_followup") that directly challenges an assertion made in the candidate's transcript (e.g., "You mentioned caching the token in Redis; what happens if the network partitions right after cache write but before the DB commit?"). Include 2 rubric criteria.
- If is_final_question is True:
  dynamic_follow_up MUST be null.
"""


class VivaService:
    async def generate_viva(
        self, req: GenerateVivaRequest
    ) -> tuple[GenerateVivaResponseData, Dict[str, Any]]:
        artifacts_formatted = "\n- ".join(req.claimed_artifacts)
        unsubstantiated_text = (
            "\n- ".join(req.unsubstantiated_claims)
            if req.unsubstantiated_claims
            else "None flagged."
        )
        snippets_text = (
            "\n---\n".join(req.code_snippets[:3])
            if req.code_snippets
            else "None provided."
        )

        prompt = f"""
Role Title: {req.role_title}
Job Context: {req.job_description or "Standard Senior Backend Engineering requirements"}

Verified Evidence Summary:
{req.evidence_summary}

Claimed Artifacts & Verified Deliverables:
- {artifacts_formatted}

Unsubstantiated Resume Buzzwords to Probe (from Intake):
- {unsubstantiated_text}

Verified Code Snippets (from Kanban Proof-of-Work):
{snippets_text}

Generate exactly 3 targeted viva questions:
- Q1: Architectural Deep Dive (with 2-3 rubrics and spoken sample_candidate_answer)
- Q2: Concurrency / Failure Trade-off (with 2-3 rubrics and spoken sample_candidate_answer)
- Q3: Requirement Mutation Stress Test (with 2-3 rubrics and spoken sample_candidate_answer)
Include practical defense guidance for the hiring team.
"""
        parsed_dict, meta = await llm_service.generate_structured(
            prompt=prompt,
            system_instruction=GENERATE_VIVA_SYSTEM_INSTRUCTION,
            response_schema=GenerateVivaResponseData,
        )
        return GenerateVivaResponseData(**parsed_dict), meta

    async def evaluate_defense(
        self, req: EvaluateDefenseRequest
    ) -> tuple[EvaluateDefenseResponseData, Dict[str, Any]]:
        rubrics_formatted = "\n".join(
            [f"- [{r.id}] {r.text} (Expected: {r.expected_signal})" for r in req.question.rubric]
        )

        prompt = f"""
Question ID: {req.question.id}
Question Text: {req.question.question_text}
Question Type: {req.question.question_type}
Referenced Artifact: {req.question.referenced_artifact}

Target Rubric Criteria:
{rubrics_formatted}

Candidate Delivery Channel: {req.delivery_mode}
Candidate Transcript:
\"\"\"{req.transcript.strip()}\"\"\"

Is Final Round: {req.is_final_question}

Evaluate transcript against each rubric criterion. Determine score (1-5), suggested_mark ('adequate', 'weak', or 'none'), concise rationale, and generate 1 adaptive follow-up question if not final round.
"""
        parsed_dict, meta = await llm_service.generate_structured(
            prompt=prompt,
            system_instruction=EVALUATE_DEFENSE_SYSTEM_INSTRUCTION,
            response_schema=EvaluateDefenseResponseData,
        )
        return EvaluateDefenseResponseData(**parsed_dict), meta


viva_service = VivaService()
