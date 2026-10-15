from typing import List, Tuple
from pydantic import BaseModel

from core.config import config
from core.llm import llm_service
from src.kanban.schemas import (
    GenerateSpecRequest,
    GenerateSpecResponseData,
    ProjectChallenge,
    TaskItem,
)


class LLMSpecResponse(BaseModel):
    challenge_title: str
    problem_statement: str
    tech_stack_focus: str
    tasks: List[TaskItem]
    evidence_summary: str


class KanbanService:
    @staticmethod
    def _get_fallback_spec(request: GenerateSpecRequest) -> GenerateSpecResponseData:
        """Fallback generator when GEMINI_API_KEY is not configured, providing realistic enterprise data."""
        challenge = request.project_challenge or ProjectChallenge(
            title="Idempotent Transactional Ledger & Webhook Dispatcher",
            problem_statement=(
                "Architect a multi-tenant payment reconciliation engine that ingests asynchronous "
                "financial webhook events, enforces exactly-once processing via idempotency tokens, "
                "and maintains a dual-entry ledger with concurrency-safe row-level locking in PostgreSQL."
            ),
            tech_stack_focus="FastAPI, PostgreSQL, Redis, Docker, Pytest",
        )

        tasks = [
            # Sprint 1: Schema & Models
            TaskItem(
                id="TF-S1-01",
                sprint=1,
                title="Design PostgreSQL Double-Entry Ledger Tables & Composite Indices",
                description="Model immutable ledger_entries and account_balances with strict foreign keys and currency constraints.",
                estimated_hours=4,
                acceptance_criteria="• PostgreSQL schema migration creates tables with NUMERIC(18,4) precision.\n• Composite index on (account_id, created_at) for sub-5ms ledger query latency.\n• CHECK constraint enforces non-negative balance on asset accounts.",
                suggested_path="src/database/models/ledger.py",
                status="open",
            ),
            TaskItem(
                id="TF-S1-02",
                sprint=1,
                title="Implement Pydantic v2 Strict Validation Schemas for Financial Events",
                description="Enforce schema validation on incoming transaction events with custom validators for ISO currencies and idempotency UUIDs.",
                estimated_hours=3,
                acceptance_criteria="• Pydantic model rejects payloads missing transaction_uuid or timestamp.\n• String currency code validated against ISO 4217 whitelist.\n• Unit tests assert validation error formatting and field-level error messages.",
                suggested_path="src/schemas/transaction.py",
                status="open",
            ),
            TaskItem(
                id="TF-S1-03",
                sprint=1,
                title="Create Redis Distributed Lock & Idempotency Key Manager",
                description="Build a concurrency-safe Redis lock helper to prevent simultaneous processing of duplicate webhook payloads.",
                estimated_hours=5,
                acceptance_criteria="• Redis SET NX EX acquires a 30-second lease keyed by sha256(payload_body).\n• Lock release happens in a finally block via a Lua script.\n• Concurrent worker simulation proves second event receives 409 Conflict.",
                suggested_path="src/core/idempotency.py",
                status="open",
            ),
            # Sprint 2: APIs & Controllers
            TaskItem(
                id="TF-S2-01",
                sprint=2,
                title="Implement Transaction Ingestion Endpoint with Granian Concurrency",
                description="Build POST /api/v1/transactions with asynchronous database session and transactional commit boundary.",
                estimated_hours=6,
                acceptance_criteria="• FastAPI router handles POST /v1/transactions with AsyncSession.\n• Database rollback verified when balance insufficient.\n• Returns HTTP 201 with immutable transaction_id and balance snapshot.",
                suggested_path="src/api/v1/transactions.py",
                status="open",
            ),
            TaskItem(
                id="TF-S2-02",
                sprint=2,
                title="Build Asynchronous Webhook Dispatcher with Dead-Letter Retry Queue",
                description="Implement reliable background event dispatching with exponential backoff and dead-letter queue recovery.",
                estimated_hours=5,
                acceptance_criteria="• Failed HTTP webhooks retried 3 times with 2s, 4s, 8s backoff.\n• Permanently failing deliveries routed to dead_letter_events table.\n• Metrics emitted for delivery latency and retry counts.",
                suggested_path="src/services/webhook_dispatcher.py",
                status="open",
            ),
            TaskItem(
                id="TF-S2-03",
                sprint=2,
                title="Add SlowAPI Token-Bucket Rate Limiter & Security Headers",
                description="Protect ingestion routes from DDoS bursts using client IP and API key rate limiting tiers.",
                estimated_hours=3,
                acceptance_criteria="• Endpoint limited to 60 req/minute per API key.\n• 429 response includes Retry-After header.\n• Rate limit headers X-RateLimit-Limit and X-RateLimit-Remaining exposed.",
                suggested_path="src/core/rate_limit.py",
                status="open",
            ),
            # Sprint 3: Deploy & Testing
            TaskItem(
                id="TF-S3-01",
                sprint=3,
                title="Construct End-to-End Pytest Concurrency & Race Condition Suite",
                description="Write automated integration tests simulating concurrent debit/credit requests against the same account.",
                estimated_hours=6,
                acceptance_criteria="• pytest-asyncio runs 20 parallel coroutines targeting single account.\n• Zero balance discrepancies observed post-execution (atomic consistency).\n• 100% assertions pass on clean test database fixture.",
                suggested_path="tests/integration/test_concurrency.py",
                status="open",
            ),
            TaskItem(
                id="TF-S3-02",
                sprint=3,
                title="Docker Compose Multi-Container Orchestration with PostgreSQL Healthchecks",
                description="Package the backend, PostgreSQL 16, and Redis with healthcheck dependencies and isolated bridge network.",
                estimated_hours=4,
                acceptance_criteria="• docker compose up -d launches app, db, and redis cleanly.\n• pg_isready healthcheck ensures migrations only run after DB is ready.\n• Production non-root user enforced in Dockerfile.",
                suggested_path="docker-compose.yml",
                status="open",
            ),
            TaskItem(
                id="TF-S3-03",
                sprint=3,
                title="GitHub Actions CI Pipeline for Static Analysis & Test Coverage",
                description="Configure GitHub Actions workflow running ruff linting, pyright typechecking, and pytest with 80%+ coverage gate.",
                estimated_hours=3,
                acceptance_criteria="• CI triggers on pull_request and push to main.\n• Workflow fails if test coverage drops below 80%.\n• Build artifacts and test reports uploaded as workflow summary.",
                suggested_path=".github/workflows/ci.yml",
                status="open",
            ),
        ]

        evidence_summary = (
            f"The candidate has been tasked with building the '{challenge.title}', addressing key gaps in "
            f"distributed idempotency, PostgreSQL schema modeling, and concurrent event handling. "
            f"Verification will inspect Redis lock implementation, async transaction boundaries, and "
            f"concurrency test assertions to evaluate Day-Zero senior capability."
        )

        tasks = KanbanService._apply_prior_verification(tasks, request.prior_verification)

        return GenerateSpecResponseData(
            project_challenge=challenge,
            tasks=tasks,
            evidence_summary=evidence_summary,
        )

    @staticmethod
    def _apply_prior_verification(tasks: List[TaskItem], prior) -> List[TaskItem]:
        if not prior:
            return tasks

        verified_skills = getattr(prior, "verified_skills", None) or []
        verified_deliverables = getattr(prior, "verified_deliverables", None) or []
        verification_id = getattr(prior, "verification_id", "TF-VERIFY")
        verified_at = getattr(prior, "verified_at", "Previous Evaluation")
        target_role = getattr(prior, "target_role", "Prior Verified Role")

        for task in tasks:
            task_text = f"{task.title} {task.description} {task.suggested_path}".lower()
            matched_skills = [s for s in verified_skills if s.lower() in task_text]
            matched_deliverable = any(d.lower() in task_text or task.id.lower() in d.lower() for d in verified_deliverables)

            if matched_skills or matched_deliverable:
                task.status = "pre_verified"
                task.pre_verified_source = {
                    "verification_id": verification_id,
                    "verified_at": verified_at,
                    "role": target_role,
                    "matched_skills": matched_skills or ["Core Engineering"],
                }
                disp_skills = ", ".join(matched_skills[:2]) if matched_skills else "Prior Artifact"
                task.notes = f"Pre-verified ({disp_skills}) carried over from {verification_id}"

        return tasks


    async def generate_spec(
        self, request: GenerateSpecRequest
    ) -> Tuple[GenerateSpecResponseData, dict]:
        # If GEMINI_API_KEY is not configured, gracefully use the fallback enterprise spec generator
        if not config.GEMINI_API_KEY:
            return self._get_fallback_spec(request), {
                "model": "fallback-generator",
                "latency_ms": 12,
            }

        challenge_context = ""
        if request.project_challenge:
            challenge_context = f"""
SPECIFIED PROJECT CHALLENGE:
Title: {request.project_challenge.title}
Problem Statement: {request.project_challenge.problem_statement}
Target Stack Focus: {request.project_challenge.tech_stack_focus or 'Standard enterprise stack'}
"""

        gaps_list = [
            f"- {gap.name} ({gap.severity}): {gap.explanation}"
            for gap in (request.skill_gap_analysis.critical_gaps + request.skill_gap_analysis.high_gaps)
        ]
        gaps_text = "\n".join(gaps_list) if gaps_list else "General senior backend architecture capability"

        system_instruction = (
            "You are a Principal Software Architect designing a rigorous 3-sprint engineering proof-of-work "
            "Kanban roadmap for a candidate being evaluated for a technical role. "
            "The plan MUST be anchored in a realistic, non-trivial engineering challenge that forces the candidate "
            "to prove their capability on their identified skill gaps. "
            "You must output exactly 9 tasks: exactly 3 for Sprint 1 (Schema & Models), "
            "exactly 3 for Sprint 2 (APIs & Controllers), and exactly 3 for Sprint 3 (Deploy & Testing). "
            "Each task must have concrete, verifiable acceptance criteria and a realistic file path. "
            "Return only valid JSON matching the schema."
        )

        prompt = f"""
TARGET ROLE: {request.role_title}
JOB REQUIREMENTS:
{request.job_description}

IDENTIFIED SKILL GAPS TO PROVE:
{gaps_text}
{challenge_context}

Generate a comprehensive 3-sprint Kanban specification:
1. Define/refine the project_challenge with a crisp title, concrete problem_statement, and tech_stack_focus.
2. Generate exactly 9 tasks (Sprint 1: Schema & Models [id: TF-S1-01, TF-S1-02, TF-S1-03]; Sprint 2: APIs & Controllers [id: TF-S2-01, TF-S2-02, TF-S2-03]; Sprint 3: Deploy & Testing [id: TF-S3-01, TF-S3-02, TF-S3-03]).
3. Provide a concise evidence_summary synthesizing the technical deliverables to seed viva oral questions.
"""

        parsed_dict, meta = await llm_service.generate_structured(
            prompt=prompt,
            system_instruction=system_instruction,
            response_schema=LLMSpecResponse,
        )

        challenge = ProjectChallenge(
            title=parsed_dict.get("challenge_title", "Engineering Challenge"),
            problem_statement=parsed_dict.get("problem_statement", ""),
            tech_stack_focus=parsed_dict.get("tech_stack_focus", ""),
        )

        raw_tasks = parsed_dict.get("tasks", [])
        tasks: List[TaskItem] = []
        for t in raw_tasks:
            if isinstance(t, dict):
                tasks.append(TaskItem(**t))
            elif isinstance(t, TaskItem):
                tasks.append(t)

        tasks = KanbanService._apply_prior_verification(tasks, request.prior_verification)

        response_data = GenerateSpecResponseData(
            project_challenge=challenge,
            tasks=tasks,
            evidence_summary=parsed_dict.get("evidence_summary", ""),
        )

        return response_data, meta


kanban_service = KanbanService()
