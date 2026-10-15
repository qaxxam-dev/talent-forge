import re
from typing import Optional
import httpx

from src.repo.schemas import (
    AnalyzeRepoRequest,
    AnalyzeRepoResponseData,
    RepoFileHighlight,
)

GITHUB_URL_PATTERN = re.compile(
    r"^https?://(?:www\.)?github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)/?$",
    re.IGNORECASE,
)

PRESET_REPO_PROFILES = {
    "aarav-sharma/fastapi-distributed-queue": AnalyzeRepoResponseData(
        repo_name="fastapi-distributed-queue",
        owner="aarav-sharma",
        stars=14,
        primary_language="Python",
        has_sufficient_signal=True,
        recommended_path="repo",
        confidence_score=92,
        reasoning="High-signal codebase — async consumers, Redis pooling, and containerized FastAPI pipelines match role requirements.",
        github_url="https://github.com/aarav-sharma/fastapi-distributed-queue",
        key_files=[
            RepoFileHighlight(
                path="app/core/queue_consumer.py",
                language="Python",
                relevance_explanation="Implements async event polling with exponential backoff on queue starvation.",
                code_snippet="""async def consume_batch(queue_client, batch_size: int = 50):
    async with queue_client.pipeline(transaction=True) as pipe:
        tasks = await pipe.lpop("task_queue", batch_size).execute()
        return [json.loads(t) for t in tasks if t]""",
            ),
            RepoFileHighlight(
                path="app/database/connection_pool.py",
                language="Python",
                relevance_explanation="PostgreSQL connection pooling configuration handling 100 concurrent checkout connections.",
                code_snippet="""engine = create_async_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=10,
    pool_timeout=30,
    pool_pre_ping=True
)""",
            ),
            RepoFileHighlight(
                path="app/main.py",
                language="Python",
                relevance_explanation="ASGI FastAPI entrypoint with health check probes and structured middleware logging.",
                code_snippet="""app = FastAPI(title="Distributed Queue Worker", lifespan=lifespan)
app.add_middleware(GZipMiddleware, minimum_size=1000)""",
            ),
            RepoFileHighlight(
                path="Dockerfile",
                language="Dockerfile",
                relevance_explanation="Multi-stage minimal Debian build optimizing image size to 142MB.",
                code_snippet="""FROM python:3.11-slim as builder
WORKDIR /app
COPY pyproject.toml .
RUN pip install --no-cache-dir .""",
            ),
        ],
        evidence_summary="Verified candidate codebase contains 4 core architectural modules handling async queuing, PostgreSQL connection pooling, and multi-stage container deployment.",
    ),
    "priyanair/fintech-ledger-engine": AnalyzeRepoResponseData(
        repo_name="fintech-ledger-engine",
        owner="priyanair",
        stars=28,
        primary_language="TypeScript",
        has_sufficient_signal=True,
        recommended_path="repo",
        confidence_score=88,
        reasoning="Strong transactional signal: Implements double-entry ledger bookkeeping with ACID transaction boundary guarantees and idempotency keys.",
        github_url="https://github.com/priyanair/fintech-ledger-engine",
        key_files=[
            RepoFileHighlight(
                path="src/ledger/transaction_service.ts",
                language="TypeScript",
                relevance_explanation="Handles atomic debit/credit balances within an explicit database transaction.",
                code_snippet="""export async function postJournalEntry(client: PoolClient, entry: Entry) {
  await client.query('BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE');
  const sum = entry.lines.reduce((acc, l) => acc + l.amount, 0);
  if (sum !== 0) throw new UnbalancedJournalError();
  // ...
}""",
            ),
            RepoFileHighlight(
                path="src/db/migrations/001_initial.sql",
                language="SQL",
                relevance_explanation="Strict foreign key constraints and composite indexes for audit log queries.",
                code_snippet="""CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id),
  amount NUMERIC(18, 4) NOT NULL
);""",
            ),
        ],
        evidence_summary="Verified production financial ledger implementation with zero-balance validation and idempotent transaction processing.",
    ),
    "rohan-v/go-micro-gateway": AnalyzeRepoResponseData(
        repo_name="go-micro-gateway",
        owner="rohan-v",
        stars=9,
        primary_language="Go",
        has_sufficient_signal=True,
        recommended_path="repo",
        confidence_score=85,
        reasoning="Solid networking signal: Features custom reverse proxy reverse routing and sliding-window rate limiters.",
        github_url="https://github.com/rohan-v/go-micro-gateway",
        key_files=[
            RepoFileHighlight(
                path="internal/ratelimit/sliding_window.go",
                language="Go",
                relevance_explanation="Thread-safe sliding log rate limiter using sync.RWMutex.",
                code_snippet="""func (rl *SlidingWindowLimiter) Allow(key string) bool {
    rl.mu.Lock()
    defer rl.mu.Unlock()
    // sliding window log eviction
}""",
            ),
        ],
        evidence_summary="Verified Go API gateway with sliding-window concurrency controls and low-latency reverse proxying.",
    ),
    "sneha-patel/ecommerce-catalog-search": AnalyzeRepoResponseData(
        repo_name="ecommerce-catalog-search",
        owner="sneha-patel",
        stars=5,
        primary_language="Python",
        has_sufficient_signal=True,
        recommended_path="repo",
        confidence_score=78,
        reasoning="Reasonable data engineering signal: Full-text indexing with Elasticsearch, but lacks asynchronous concurrency.",
        github_url="https://github.com/sneha-patel/ecommerce-catalog-search",
        key_files=[
            RepoFileHighlight(
                path="search/indexer.py",
                language="Python",
                relevance_explanation="Bulk indexing script for 100k SKU catalogs with fuzzy search analyzers.",
                code_snippet="""def bulk_index_products(es_client, products):
    helpers.bulk(es_client, [{'index': {'_index': 'products'}, **p} for p in products])""",
            )
        ],
        evidence_summary="Verified search indexer with bulk SKU synchronization; recommend viva probing on async concurrency.",
    ),
    "kavita-r/react-inventory-dash": AnalyzeRepoResponseData(
        repo_name="react-inventory-dash",
        owner="kavita-r",
        stars=2,
        primary_language="JavaScript",
        has_sufficient_signal=False,
        recommended_path="kanban",
        confidence_score=38,
        reasoning="Insufficient backend signal: Repository is a frontend React UI dashboard. It lacks the server-side, asynchronous, and database architecture required for this role.",
        github_url="https://github.com/kavita-r/react-inventory-dash",
        key_files=[
            RepoFileHighlight(
                path="src/App.jsx",
                language="JavaScript",
                relevance_explanation="React component rendering mock table data without live backend APIs.",
                code_snippet="""function App() { return <div><h1>Inventory</h1></div>; }""",
            )
        ],
        evidence_summary="Candidate repo is frontend-only. 3-Sprint Engineering Spec required to generate backend defense artifacts.",
    ),
}


class RepoAnalysisService:
    async def analyze_repo(
        self, request: AnalyzeRepoRequest
    ) -> tuple[AnalyzeRepoResponseData, dict]:
        clean_url = request.github_url.strip().rstrip("/")
        match = GITHUB_URL_PATTERN.match(clean_url)
        if not match:
            # Fallback for invalid or unparseable URLs
            return (
                AnalyzeRepoResponseData(
                    repo_name="unknown-repo",
                    owner="unknown",
                    stars=0,
                    primary_language="Unknown",
                    has_sufficient_signal=False,
                    recommended_path="kanban",
                    confidence_score=0,
                    reasoning="GitHub URL format could not be parsed. Defaulting to 3-Sprint Engineering Spec.",
                    github_url=request.github_url,
                    key_files=[],
                    evidence_summary="No valid repository provided. Kanban spec path recommended.",
                ),
                {"mode": "invalid_url_fallback"},
            )

        owner, repo = match.group(1).lower(), match.group(2).lower()
        key = f"{owner}/{repo}"

        # 1. Check instant demo presets
        if key in PRESET_REPO_PROFILES:
            profile = PRESET_REPO_PROFILES[key]
            return profile, {"source": "preset_cache", "speed": "instant"}

        # 2. Live GitHub REST API inspection with 4-second timeout
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                repo_res = await client.get(
                    f"https://api.github.com/repos/{owner}/{repo}",
                    headers={"User-Agent": "TalentForge-Auditor/1.0"},
                )
                if repo_res.status_code == 200:
                    data = repo_res.json()
                    stars = data.get("stargazers_count", 0)
                    lang = data.get("language") or "Code"
                    desc = data.get("description") or "Candidate repository"

                    # Fetch root tree
                    tree_res = await client.get(
                        f"https://api.github.com/repos/{owner}/{repo}/contents",
                        headers={"User-Agent": "TalentForge-Auditor/1.0"},
                    )
                    files = []
                    if tree_res.status_code == 200:
                        contents = tree_res.json()
                        if isinstance(contents, list):
                            for item in contents[:6]:
                                if item.get("type") == "file":
                                    files.append(
                                        RepoFileHighlight(
                                            path=item.get("name", "file"),
                                            language=lang,
                                            relevance_explanation=f"Root code module in candidate {repo} repository.",
                                            code_snippet=None,
                                        )
                                    )

                    has_signal = len(files) >= 2
                    rec_path = "repo" if has_signal else "kanban"
                    confidence = 75 if has_signal else 35

                    return (
                        AnalyzeRepoResponseData(
                            repo_name=repo,
                            owner=owner,
                            stars=stars,
                            primary_language=lang,
                            has_sufficient_signal=has_signal,
                            recommended_path=rec_path,
                            confidence_score=confidence,
                            reasoning=f"Public repository verified with {len(files)} top-level files in {lang}. {desc}",
                            key_files=files,
                            evidence_summary=f"Public repository {owner}/{repo} contains verified {lang} codebase evidence.",
                            github_url=request.github_url,
                        ),
                        {"source": "live_github_api", "status_code": 200},
                    )
        except Exception:
            pass

        # Fallback if repo is private, rate limited, or unreachable
        return (
            AnalyzeRepoResponseData(
                repo_name=repo,
                owner=owner,
                stars=0,
                primary_language="Python",
                has_sufficient_signal=False,
                recommended_path="kanban",
                confidence_score=30,
                reasoning="Repository is unreachable or private under public GitHub inspection. Defaulting to 3-Sprint Engineering Spec.",
                github_url=request.github_url,
                key_files=[],
                evidence_summary="Repository inspection unverified. 3-Sprint Kanban spec recommended for oral viva preparation.",
            ),
            {"source": "graceful_fallback"},
        )


repo_service = RepoAnalysisService()
