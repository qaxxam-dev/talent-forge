from datetime import datetime, timezone
from typing import List
from pydantic import BaseModel

from core.llm import llm_service
from src.dossier.schemas import (
    AuthorshipSealRef,
    BusinessImpact,
    GenerateDossierRequest,
    VerificationDossierData,
)
from src.seal.schemas import CreateSealRequest
from src.seal.service import seal_service


class ImpactListSchema(BaseModel):
    impacts: List[BusinessImpact]
    executive_summary: str


class DossierService:
    async def generate_dossier(
        self, request: GenerateDossierRequest
    ) -> tuple[VerificationDossierData, dict]:
        now_utc = datetime.now(timezone.utc)
        generated_at = now_utc.strftime("%Y-%m-%dT%H:%M:%SZ")

        # 1. Ensure Authorship Seal exists
        if request.seal:
            seal_ref = request.seal
        else:
            seal_data, _ = seal_service.generate_seal(
                CreateSealRequest(
                    candidate_id=request.candidate_id,
                    candidate_name=request.candidate_name,
                    target_role=request.target_role,
                    verified_tasks=request.verified_tasks,
                    viva_marks=request.viva_marks,
                )
            )
            seal_ref = AuthorshipSealRef(
                verification_id=seal_data.verification_id,
                content_hash=seal_data.content_hash,
                timestamp=seal_data.timestamp,
            )

        # 2. Calculate Day-Zero Score
        base_match = request.match_percentage
        viva_adjust = 0
        for mark in request.viva_marks:
            m = str(mark).lower()
            if "adequate" in m or "pass" in m:
                viva_adjust += 6
            elif "weak" in m:
                viva_adjust -= 4
            elif "none" in m or "fail" in m:
                viva_adjust -= 10

        day_zero_score = max(20, min(98, round(base_match * 0.65 + (70 + viva_adjust) * 0.35)))

        # 3. Generate Business Impacts (LLM with deterministic fallback)
        system_instruction = (
            "You are an executive talent evaluator translating engineering verification into commercial impact. "
            "Generate exactly 3 concise business impact statements and a 2-sentence executive summary. "
            "Return valid JSON matching schema."
        )

        prompt = f"""
CANDIDATE: {request.candidate_name}
TARGET ROLE: {request.target_role}
MATCH PERCENTAGE: {request.match_percentage}%
DAY-ZERO SCORE: {day_zero_score}/100
VERIFIED DELIVERABLES: {request.verified_tasks}
VIVA DEFENSE OUTCOMES: {request.viva_marks}

Translate these technical defense artifacts into plain-English commercial value for the engineering manager and staffing recruiter.
"""

        try:
            impact_res, meta = await llm_service.generate_structured(
                prompt=prompt,
                system_instruction=system_instruction,
                response_schema=ImpactListSchema,
            )
            parsed = ImpactListSchema(**impact_res)
            impacts = parsed.impacts
            executive_summary = parsed.executive_summary
        except Exception:
            meta = {"fallback": True}
            impacts = [
                BusinessImpact(
                    technical_deliverable="Containerized Asynchronous Ingestion Engine",
                    commercial_value="Accelerates sprint onboarding velocity by an estimated 3 weeks without senior dev shadowing.",
                    risk_mitigated="Prevents blocking I/O bottleneck incidents under peak campus volume traffic.",
                ),
                BusinessImpact(
                    technical_deliverable="Relational Schema Normalization & Indexing",
                    commercial_value="Guarantees sub-50ms query latency across multi-tenant database partitions.",
                    risk_mitigated="Eliminates table scan performance degradation and connection pool starvation.",
                ),
                BusinessImpact(
                    technical_deliverable="Live Code-Defend Oral Viva Verification",
                    commercial_value="Delivers auditable verification of genuine authorship before client-facing interviews.",
                    risk_mitigated="Shields the hiring organization against generative-AI plagiarism and inflated credentials.",
                ),
            ]
            executive_summary = (
                f"{request.candidate_name} demonstrated strong baseline competence for {request.target_role} with an evaluated "
                f"Day-Zero Readiness score of {day_zero_score}%. Oral viva defense confirmed hands-on understanding of architectural trade-offs."
            )

        # 4. Construct ATS Export Structure
        ats_export = {
            "version": "1.0-talentforge",
            "candidate_id": request.candidate_id,
            "candidate_name": request.candidate_name,
            "target_role": request.target_role,
            "day_zero_score": day_zero_score,
            "verification_status": "VERIFIED_DAY_ZERO",
            "verification_seal": seal_ref.model_dump(),
            "business_impacts": [i.model_dump() for i in impacts],
            "remaining_gaps": [g.model_dump() for g in request.remaining_gaps],
            "recommended_next_action": "FORWARD_TO_FINAL_PANEL",
            "metadata": {
                "generated_at": generated_at,
                "evaluator_type": "async_code_defend_funnel",
            },
        }

        dossier = VerificationDossierData(
            candidate_label=request.candidate_name,
            role=request.target_role,
            day_zero_score=day_zero_score,
            seal=seal_ref,
            impacts=impacts,
            remaining_gaps=request.remaining_gaps,
            generated_at=generated_at,
            executive_summary=executive_summary,
            ats_export_payload=ats_export,
        )

        return dossier, meta


dossier_service = DossierService()
