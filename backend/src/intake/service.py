import asyncio
import io
import re
from typing import List, Optional
import docx
import pypdf
from core.exceptions import BadRequestException
from core.llm import llm_service
from core.pii import sanitize_text
from src.intake.schemas import (
    BatchCandidateInput,
    BatchCandidateOutput,
    BatchIntakeRequest,
    BatchIntakeResponseData,
    IntakeRequest,
    IntakeResponseData,
    ParseResumeResponseData,
    SkillGap,
    SkillGapAnalysis,
)

GITHUB_REPO_RE = re.compile(
    r"^https?://(?:www\.)?github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/?$",
    re.IGNORECASE,
)

# 15 realistic candidates for campus drive batch intake demonstration
CAMPUS_DRIVE_PRESET_CANDIDATES = [
    {
        "id": "cand-001",
        "name": "Aarav Sharma",
        "email_masked": "a***@iitd.ac.in",
        "match_percentage": 92,
        "location": "New Delhi",
        "github_url": "https://github.com/aarav-sharma/fastapi-distributed-queue",
        "acquired_skills": ["Python", "FastAPI", "PostgreSQL", "Redis", "Docker", "REST APIs"],
        "critical_gaps": [
            SkillGap(
                name="Kafka Event Partitioning",
                severity="critical",
                explanation="Lacks experience handling high-throughput event rebalancing and key-based partitioning.",
            )
        ],
        "high_gaps": [
            SkillGap(
                name="Database Connection Pooling",
                severity="high",
                explanation="Need to verify handling of connection pool exhaustion under 5k req/s concurrency.",
            )
        ],
        "suggested_shortlist": True,
        "sanitized_resume": "B.Tech Computer Science candidate with 2 production backend internships. Built asynchronous ingestion pipeline using FastAPI, SQLAlchemy 2.0, and Redis cache. Deployed containerized microservices on AWS ECS with Docker.",
        "raw_resume": "Aarav Sharma - New Delhi - aarav.sharma@example.com - B.Tech CS. Experienced in FastAPI, Redis, Postgres, Docker.",
        "suggested_path": "repo",
    },
    {
        "id": "cand-002",
        "name": "Priya Nair",
        "email_masked": "p***@bits-pilani.ac.in",
        "match_percentage": 88,
        "location": "Bengaluru",
        "github_url": "https://github.com/priyanair/fintech-ledger-engine",
        "acquired_skills": ["TypeScript", "Node.js", "Python", "PostgreSQL", "Docker", "Unit Testing"],
        "critical_gaps": [
            SkillGap(
                name="Distributed Two-Phase Commit",
                severity="critical",
                explanation="Missing proven design patterns for atomic multi-service ledger transactions.",
            )
        ],
        "high_gaps": [
            SkillGap(
                name="FastAPI Asynchronous Generators",
                severity="high",
                explanation="Primary experience is in Express/NestJS, needs verification on Python async generator streams.",
            )
        ],
        "suggested_shortlist": True,
        "sanitized_resume": "Senior undergraduate at Tier-1 engineering institute. Created double-entry bookkeeping microservice using TypeScript and PostgreSQL. Integrated Redis pub/sub for real-time notification dispatch.",
        "raw_resume": "Priya Nair - Bengaluru - priya.nair@bits.edu - Software Engineering intern. Full stack ledger developer.",
        "suggested_path": "repo",
    },
    {
        "id": "cand-003",
        "name": "Rohan Varma",
        "email_masked": "r***@nitk.edu.in",
        "match_percentage": 84,
        "location": "Hyderabad",
        "github_url": "https://github.com/rohan-v/go-micro-gateway",
        "acquired_skills": ["Python", "Go", "PostgreSQL", "Docker", "Linux Internals"],
        "critical_gaps": [
            SkillGap(
                name="Horizontal Database Sharding",
                severity="critical",
                explanation="Has not implemented cross-shard querying or consistent hashing for partition routing.",
            )
        ],
        "high_gaps": [
            SkillGap(
                name="Rate Limiting Algorithms",
                severity="high",
                explanation="Basic fixed-window limiter used; needs token-bucket or sliding-log validation.",
            )
        ],
        "suggested_shortlist": True,
        "sanitized_resume": "Backend developer with strong systems background. Authored API gateway in Go and Python FastAPI microservices. Configured CI/CD GitHub Actions pipeline with automated smoke testing.",
        "raw_resume": "Rohan Varma - Hyderabad - rohan@nitk.ac.in - Systems engineer, Go, Python, Docker.",
        "suggested_path": "repo",
    },
    {
        "id": "cand-004",
        "name": "Sneha Patel",
        "email_masked": "s***@vjti.ac.in",
        "match_percentage": 79,
        "location": "Mumbai",
        "github_url": "https://github.com/sneha-patel/ecommerce-catalog-search",
        "acquired_skills": ["Python", "Flask", "PostgreSQL", "Elasticsearch", "Git"],
        "critical_gaps": [
            SkillGap(
                name="FastAPI ASGI Event Loop",
                severity="critical",
                explanation="Flask background means blocking synchronous code patterns must be tested in ASGI context.",
            )
        ],
        "high_gaps": [
            SkillGap(
                name="Docker Multi-Stage Builds",
                severity="high",
                explanation="Container images currently 800MB+; lacks production container optimization.",
            )
        ],
        "suggested_shortlist": True,
        "sanitized_resume": "Computer Engineering graduate. Built catalog search engine with Elasticsearch and Flask. Handled 100k SKU database with optimized PostgreSQL indexes and Redis cache.",
        "raw_resume": "Sneha Patel - Mumbai - sneha.p@vjti.ac.in - Backend developer specializing in Python search catalogs.",
        "suggested_path": "repo",
    },
    {
        "id": "cand-005",
        "name": "Aditya Deshmukh",
        "email_masked": "a***@coep.ac.in",
        "match_percentage": 76,
        "location": "Pune",
        "github_url": None,
        "acquired_skills": ["Python", "Django", "PostgreSQL", "REST APIs", "Celery"],
        "critical_gaps": [
            SkillGap(
                name="Cache Invalidation Strategies",
                severity="critical",
                explanation="Stale cache read vulnerabilities evident in Celery background update workflows.",
            )
        ],
        "high_gaps": [
            SkillGap(
                name="Kubernetes Deployment Manifests",
                severity="high",
                explanation="No direct orchestration experience outside local docker-compose.",
            )
        ],
        "suggested_shortlist": True,
        "sanitized_resume": "Final year engineer with experience in Django ORM and Celery task queues. Designed webhook dispatch service processing 20k daily events. Strong SQL schema design foundations.",
        "raw_resume": "Aditya Deshmukh - Pune - aditya.d@coep.ac.in - Django backend and asynchronous task runner specialist.",
        "suggested_path": "kanban",
    },
    {
        "id": "cand-006",
        "name": "Meera Iyer",
        "email_masked": "m***@annauniv.edu",
        "match_percentage": 71,
        "location": "Chennai",
        "github_url": None,
        "acquired_skills": ["Python", "FastAPI", "SQLite", "HTML/CSS"],
        "critical_gaps": [
            SkillGap(
                name="Production PostgreSQL Tuning",
                severity="critical",
                explanation="Only used SQLite locally; unfamiliar with connection pooling and vacuuming.",
            )
        ],
        "high_gaps": [
            SkillGap(
                name="Docker Containerization",
                severity="high",
                explanation="Has not deployed applications within Docker containers.",
            )
        ],
        "suggested_shortlist": False,
        "sanitized_resume": "Junior software developer. Built student attendance API with FastAPI and SQLite. Good grasp of HTTP verbs and Pydantic validation schemas.",
        "raw_resume": "Meera Iyer - Chennai - meera@annauniv.edu - Junior developer with Python FastAPI coursework.",
        "suggested_path": "kanban",
    },
    {
        "id": "cand-007",
        "name": "Kavita Reddy",
        "email_masked": "k***@osmania.ac.in",
        "match_percentage": 68,
        "location": "Hyderabad",
        "github_url": "https://github.com/kavita-r/react-inventory-dash",
        "acquired_skills": ["JavaScript", "React", "Node.js", "MongoDB"],
        "critical_gaps": [
            SkillGap(
                name="Python Backend Ecosystem",
                severity="critical",
                explanation="No Python experience; entire portfolio is built with MERN stack.",
            )
        ],
        "high_gaps": [
            SkillGap(
                name="Relational Database Normalization",
                severity="high",
                explanation="Exclusively used document-based MongoDB; SQL query writing unproven.",
            )
        ],
        "suggested_shortlist": False,
        "sanitized_resume": "Frontend-focused graduate with full-stack MERN experience. Created inventory dashboard with React 18 and Express backend with JWT authentication.",
        "raw_resume": "Kavita Reddy - Hyderabad - kavita@gmail.com - Full stack MERN stack intern.",
        "suggested_path": "repo",
    },
    {
        "id": "cand-008",
        "name": "Varun Sen",
        "email_masked": "v***@ju.ac.in",
        "match_percentage": 65,
        "location": "Kolkata",
        "github_url": None,
        "acquired_skills": ["Java", "Spring Boot", "MySQL", "Git"],
        "critical_gaps": [
            SkillGap(
                name="Python Asyncio Frameworks",
                severity="critical",
                explanation="Deep Java background; needs evaluation on Python async/await and ASGI ecosystem.",
            )
        ],
        "high_gaps": [
            SkillGap(
                name="Cloud Native Tooling",
                severity="high",
                explanation="Built monolithic enterprise apps without microservice or serverless paradigms.",
            )
        ],
        "suggested_shortlist": False,
        "sanitized_resume": "B.E. Information Technology. Built banking portal simulation with Spring Boot and Hibernate. Strong object-oriented design patterns and relational database indexing.",
        "raw_resume": "Varun Sen - Kolkata - varun.sen@ju.ac.in - Java Spring Boot developer.",
        "suggested_path": "kanban",
    },
    {
        "id": "cand-009",
        "name": "Ananya Roy",
        "email_masked": "a***@thapar.edu",
        "match_percentage": 60,
        "location": "Chandigarh",
        "github_url": None,
        "acquired_skills": ["Python", "Flask", "HTML", "SQLite"],
        "critical_gaps": [
            SkillGap(
                name="CI/CD and Unit Testing",
                severity="critical",
                explanation="No automated testing framework (pytest/unittest) used across academic projects.",
            )
        ],
        "high_gaps": [
            SkillGap(
                name="Concurrent Request Handling",
                severity="high",
                explanation="Unaware of race conditions when handling multiple concurrent database updates.",
            )
        ],
        "suggested_shortlist": False,
        "sanitized_resume": "Final year CSE student. Developed college event management portal using Flask. Basic understanding of RESTful API routes and Jinja templating.",
        "raw_resume": "Ananya Roy - Chandigarh - ananya@thapar.edu - Student developer with Flask experience.",
        "suggested_path": "kanban",
    },
    {
        "id": "cand-010",
        "name": "Devendra Chawla",
        "email_masked": "d***@dtu.ac.in",
        "match_percentage": 57,
        "location": "Delhi",
        "github_url": None,
        "acquired_skills": ["Python", "Pandas", "NumPy", "SQL Basics"],
        "critical_gaps": [
            SkillGap(
                name="Production Web Frameworks",
                severity="critical",
                explanation="Data science background with no API service development experience.",
            )
        ],
        "high_gaps": [
            SkillGap(
                name="HTTP Architecture & Security",
                severity="high",
                explanation="Unfamiliar with CORS, auth headers, CSRF, and rate limiting.",
            )
        ],
        "suggested_shortlist": False,
        "sanitized_resume": "Data Analytics intern with experience in data cleaning, Pandas transformations, and exploratory data analysis. Built Jupyter notebook pipelines for sales forecasts.",
        "raw_resume": "Devendra Chawla - Delhi - dev@dtu.ac.in - Python data analyst seeking backend roles.",
        "suggested_path": "kanban",
    },
    {
        "id": "cand-011",
        "name": "Ritika Ghosh",
        "email_masked": "r***@heritage.edu",
        "match_percentage": 52,
        "location": "Kolkata",
        "github_url": None,
        "acquired_skills": ["JavaScript", "HTML5", "CSS3", "Bootstrap"],
        "critical_gaps": [
            SkillGap(
                name="Backend Programming & Databases",
                severity="critical",
                explanation="Purely static frontend skills; no server-side or database knowledge.",
            )
        ],
        "high_gaps": [
            SkillGap(
                name="API Integration",
                severity="high",
                explanation="Has not consumed or designed REST endpoints with JSON payloads.",
            )
        ],
        "suggested_shortlist": False,
        "sanitized_resume": "Web development enthusiast. Built responsive landing pages with Bootstrap and vanilla JavaScript. Clean CSS architecture and semantic HTML layouts.",
        "raw_resume": "Ritika Ghosh - Kolkata - ritika@heritage.edu - Frontend web designer.",
        "suggested_path": "kanban",
    },
    {
        "id": "cand-012",
        "name": "Siddharth Joshi",
        "email_masked": "s***@srmist.edu.in",
        "match_percentage": 48,
        "location": "Chennai",
        "github_url": None,
        "acquired_skills": ["Python Basics", "Bash", "Linux"],
        "critical_gaps": [
            SkillGap(
                name="Object-Oriented Architecture",
                severity="critical",
                explanation="Only writes procedural automation scripts; lacks clean modular code structure.",
            )
        ],
        "high_gaps": [
            SkillGap(
                name="Database Schema Management",
                severity="high",
                explanation="No ORM or relational schema modeling experience.",
            )
        ],
        "suggested_shortlist": False,
        "sanitized_resume": "IT support engineer. Wrote bash and python scripts for automated file backups and log rotation across Linux test servers.",
        "raw_resume": "Siddharth Joshi - Chennai - siddharth@srm.edu - Linux IT and scripting specialist.",
        "suggested_path": "kanban",
    },
    {
        "id": "cand-013",
        "name": "Tanvi Saxena",
        "email_masked": "t***@amity.edu",
        "match_percentage": 44,
        "location": "Noida",
        "github_url": None,
        "acquired_skills": ["Manual Testing", "Postman", "Bugzilla"],
        "critical_gaps": [
            SkillGap(
                name="Production Software Development",
                severity="critical",
                explanation="QA background with no hands-on backend codebase implementation.",
            )
        ],
        "high_gaps": [
            SkillGap(
                name="Code Authoring & Refactoring",
                severity="high",
                explanation="Cannot independently write backend logic or fix algorithmic bugs.",
            )
        ],
        "suggested_shortlist": False,
        "sanitized_resume": "Quality assurance intern. Executed test cases in Postman for REST APIs and logged defect reports in Jira/Bugzilla.",
        "raw_resume": "Tanvi Saxena - Noida - tanvi@amity.edu - Software test engineer.",
        "suggested_path": "kanban",
    },
    {
        "id": "cand-014",
        "name": "Nikhil Gupta",
        "email_masked": "n***@du.ac.in",
        "match_percentage": 38,
        "location": "Delhi",
        "github_url": None,
        "acquired_skills": ["MS Excel", "Basic SQL", "Python for Data"],
        "critical_gaps": [
            SkillGap(
                name="Core Computer Science Fundamentals",
                severity="critical",
                explanation="Non-CS background with severe gaps in algorithms, memory management, and networks.",
            )
        ],
        "high_gaps": [
            SkillGap(
                name="Version Control & Git Collaboration",
                severity="high",
                explanation="Unfamiliar with git branching, merge conflict resolution, and pull requests.",
            )
        ],
        "suggested_shortlist": False,
        "sanitized_resume": "Economics graduate pursuing transition to tech. Completed online bootcamps in Python basics and SQL queries for financial spreadsheets.",
        "raw_resume": "Nikhil Gupta - Delhi - nikhil@du.ac.in - Economics student transitioning to tech.",
        "suggested_path": "kanban",
    },
    {
        "id": "cand-015",
        "name": "Pooja Kulkarni",
        "email_masked": "p***@unipune.ac.in",
        "match_percentage": 32,
        "location": "Pune",
        "github_url": None,
        "acquired_skills": ["C++ Basics", "Algorithm Analysis (Theoretical)"],
        "critical_gaps": [
            SkillGap(
                name="Modern Web Stacks",
                severity="critical",
                explanation="Theoretical academic coursework only; zero web framework or API experience.",
            )
        ],
        "high_gaps": [
            SkillGap(
                name="Asynchronous Networking",
                severity="high",
                explanation="Has not built client-server network applications.",
            )
        ],
        "suggested_shortlist": False,
        "sanitized_resume": "Mathematics and Computing student. Implemented sorting and graph algorithms in theoretical C++ coursework. Seeking entry-level engineering opportunities.",
        "raw_resume": "Pooja Kulkarni - Pune - pooja@unipune.ac.in - Mathematics graduate.",
        "suggested_path": "kanban",
    },
]


EMAIL_REGEX = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")
PHONE_REGEX = re.compile(r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{3,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}")


class IntakeService:
    @staticmethod
    def is_valid_github_url(url: str | None) -> bool:
        if not url:
            return False
        return bool(GITHUB_REPO_RE.match(url.strip()))

    def parse_resume_file(self, filename: str, content: bytes) -> ParseResumeResponseData:
        ext = filename.lower().split(".")[-1] if "." in filename else "txt"
        extracted_text = ""

        try:
            if ext == "pdf":
                reader = pypdf.PdfReader(io.BytesIO(content))
                pages = []
                for p in reader.pages:
                    txt = p.extract_text()
                    if txt:
                        pages.append(txt)
                extracted_text = "\n\n".join(pages).strip()
            elif ext in ["docx", "doc"]:
                doc = docx.Document(io.BytesIO(content))
                paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
                extracted_text = "\n".join(paragraphs).strip()
            else:
                extracted_text = content.decode("utf-8", errors="replace").strip()
        except Exception as e:
            raise BadRequestException(f"Failed to parse resume document ({filename}): {str(e)}")

        if not extracted_text:
            raise BadRequestException("Uploaded document contains no readable text or is an empty/scanned document.")

        # Detect email
        email_match = EMAIL_REGEX.search(extracted_text)
        detected_email = email_match.group(0) if email_match else None

        # Detect phone
        phone_match = PHONE_REGEX.search(extracted_text)
        detected_phone = phone_match.group(0) if phone_match else None

        # Detect GitHub repo
        gh_match = GITHUB_REPO_RE.search(extracted_text)
        detected_github = gh_match.group(0) if gh_match else None

        # Detect Name heuristic (first short line with 2-3 words before email)
        detected_name = None
        for line in extracted_text.split("\n")[:6]:
            clean = line.strip()
            words = clean.split()
            if 2 <= len(words) <= 4 and all(re.match(r"^[A-Za-z.'-]+$", w) for w in words):
                # Ensure not a common header
                if clean.lower() not in ["curriculum vitae", "resume", "summary", "profile", "contact information"]:
                    detected_name = clean
                    break

        words_count = len(extracted_text.split())

        return ParseResumeResponseData(
            raw_text=extracted_text,
            detected_name=detected_name,
            detected_email=detected_email,
            detected_phone=detected_phone,
            detected_github=detected_github,
            file_name=filename,
            word_count=words_count,
        )

    async def process_intake(
        self, request: IntakeRequest
    ) -> tuple[IntakeResponseData, dict]:
        # 1. Validation
        resume_words = request.resume_text.strip().split()
        if len(resume_words) < 25:
            raise BadRequestException(
                "Resume text must contain at least 25 words with technical experience and skills."
            )

        job_words = request.job_description.strip().split()
        if len(job_words) < 10:
            raise BadRequestException(
                "Job description must contain at least 10 words describing role requirements."
            )

        # 2. PII Sanitization (DPDP compliance before any LLM call)
        sanitization = sanitize_text(
            text=request.resume_text,
            candidate_name=request.candidate_name,
            location=request.location,
        )

        # 3. LLM Skill-Gap Analysis with Forensic Authenticity & Claim Verification
        system_instruction = (
            "You are a rigorous technical hiring forensic auditor. Analyze the sanitized candidate profile "
            "against the target job description to detect ATS keyword stuffing and evaluate true hands-on capability.\n"
            "Key forensic evaluation rules:\n"
            "1. 'acquired_skills': ONLY list skills backed by demonstrable project deliverables, code context, "
            "or quantifiable architectural work in the profile.\n"
            "2. 'unsubstantiated_claims': Identify keywords and technologies claimed in skills lists or summary paragraphs "
            "that lack concrete project implementation details or verifiable deliverables in the text.\n"
            "3. 'critical_gaps': Essential capabilities strictly required by the JD that the candidate does not demonstrably possess.\n"
            "4. 'high_gaps': Important missing capabilities OR high-risk unproven claims (from unsubstantiated_claims) "
            "that require technical defense during the code viva.\n"
            "5. 'match_percentage': Honest Day-Zero readiness score (0-100). Penalize profiles that rely on unevidenced buzzwords.\n"
            "6. 'authenticity_notes': 1-2 sentence objective assessment of candidate evidence depth vs. ATS keyword stuffing.\n"
            "Return only valid JSON matching the schema."
        )

        prompt = f"""
TARGET JOB DESCRIPTION:
{request.job_description}

SANITIZED CANDIDATE PROFILE:
{sanitization.sanitized_text}

Perform an evidence-grounded forensic skill gap audit:
- Extract acquired_skills (proven hands-on skills with project evidence).
- Extract unsubstantiated_claims (buzzwords or tools claimed without project implementation context).
- Extract critical_gaps (essential requirements missing from the candidate's demonstrable work).
- Extract high_gaps (important missing areas or unproven claims that must be challenged in technical defense).
- Calculate match_percentage (0 to 100 based on verified competence, not raw keyword mentions).
- Provide authenticity_notes (brief forensic commentary on claim authenticity).
"""

        analysis_dict, meta = await llm_service.generate_structured(
            prompt=prompt,
            system_instruction=system_instruction,
            response_schema=SkillGapAnalysis,
        )

        analysis = SkillGapAnalysis(**analysis_dict)

        # 4. Routing Decision
        suggested_path = (
            "repo" if self.is_valid_github_url(request.github_url) else "kanban"
        )

        response_data = IntakeResponseData(
            sanitized_resume=sanitization.sanitized_text,
            redacted_fields=sanitization.redacted_tokens,
            skill_gap_analysis=analysis,
            suggested_path=suggested_path,
        )

        return response_data, meta

    async def process_batch_intake(
        self, request: BatchIntakeRequest
    ) -> tuple[BatchIntakeResponseData, dict]:
        job_desc = request.job_description.strip()
        if len(job_desc.split()) < 10:
            raise BadRequestException(
                "Job description must contain at least 10 words describing role requirements."
            )

        # If preset requested or no candidates provided, serve high-volume campus drive preset
        if request.use_campus_drive_preset or not request.candidates:
            candidates_out = []
            for item in CAMPUS_DRIVE_PRESET_CANDIDATES:
                san = sanitize_text(
                    text=item["raw_resume"],
                    candidate_name=item["name"],
                    location=item["location"],
                )
                candidates_out.append(
                    BatchCandidateOutput(
                        id=item["id"],
                        name=item["name"],
                        sanitized_name=f"Candidate #{item['id'].split('-')[-1]}",
                        email_masked=item["email_masked"],
                        match_percentage=item["match_percentage"],
                        acquired_skills=item["acquired_skills"],
                        critical_gaps=item["critical_gaps"],
                        high_gaps=item["high_gaps"],
                        suggested_shortlist=item["suggested_shortlist"],
                        sanitized_resume=item["sanitized_resume"],
                        raw_resume=item["raw_resume"],
                        location=item["location"],
                        github_url=item["github_url"],
                        suggested_path=item["suggested_path"],
                    )
                )

            # Sort descending by match percentage
            candidates_out.sort(key=lambda c: c.match_percentage, reverse=True)
            shortlist_count = sum(1 for c in candidates_out if c.suggested_shortlist)

            return (
                BatchIntakeResponseData(
                    job_description=job_desc,
                    total_processed=len(candidates_out),
                    shortlist_count=shortlist_count,
                    candidates=candidates_out,
                ),
                {"mode": "campus_drive_preset", "speed": "instant"},
            )

        # Real batch processing for submitted candidates (bounded concurrency)
        semaphore = asyncio.Semaphore(4)

        async def analyze_single(cand: BatchCandidateInput) -> BatchCandidateOutput:
            async with semaphore:
                try:
                    single_req = IntakeRequest(
                        resume_text=cand.resume_text,
                        job_description=job_desc,
                        candidate_name=cand.name,
                        location=cand.location,
                        github_url=cand.github_url,
                    )
                    res, _ = await self.process_intake(single_req)
                    is_shortlist = res.skill_gap_analysis.match_percentage >= 75
                    masked_email = (
                        f"{cand.email[0]}***@{cand.email.split('@')[1]}"
                        if cand.email and "@" in cand.email
                        else "c***@campus.edu"
                    )
                    return BatchCandidateOutput(
                        id=cand.id,
                        name=cand.name or f"Candidate {cand.id}",
                        sanitized_name=f"Candidate {cand.id[:6]}",
                        email_masked=masked_email,
                        match_percentage=res.skill_gap_analysis.match_percentage,
                        acquired_skills=res.skill_gap_analysis.acquired_skills,
                        critical_gaps=res.skill_gap_analysis.critical_gaps,
                        high_gaps=res.skill_gap_analysis.high_gaps,
                        suggested_shortlist=is_shortlist,
                        sanitized_resume=res.sanitized_resume,
                        raw_resume=cand.resume_text,
                        location=cand.location,
                        github_url=cand.github_url,
                        suggested_path=res.suggested_path,
                    )
                except Exception:
                    # Fallback on failure
                    san = sanitize_text(text=cand.resume_text, candidate_name=cand.name)
                    return BatchCandidateOutput(
                        id=cand.id,
                        name=cand.name or f"Candidate {cand.id}",
                        sanitized_name=f"Candidate {cand.id[:6]}",
                        email_masked="c***@campus.edu",
                        match_percentage=50,
                        acquired_skills=["General Programming"],
                        critical_gaps=[
                            SkillGap(
                                name="Unverified Stack Readiness",
                                severity="critical",
                                explanation="Profile requires manual or live viva inspection.",
                            )
                        ],
                        high_gaps=[],
                        suggested_shortlist=False,
                        sanitized_resume=san.sanitized_text,
                        raw_resume=cand.resume_text,
                        location=cand.location,
                        github_url=cand.github_url,
                        suggested_path="kanban",
                    )

        tasks = [analyze_single(cand) for cand in request.candidates]
        candidates_out = await asyncio.gather(*tasks)
        candidates_out.sort(key=lambda c: c.match_percentage, reverse=True)

        # Mark top 5 as suggested shortlist if none marked yet
        if not any(c.suggested_shortlist for c in candidates_out):
            for c in candidates_out[:5]:
                c.suggested_shortlist = True

        shortlist_count = sum(1 for c in candidates_out if c.suggested_shortlist)

        return (
            BatchIntakeResponseData(
                job_description=job_desc,
                total_processed=len(candidates_out),
                shortlist_count=shortlist_count,
                candidates=candidates_out,
            ),
            {"mode": "live_async_batch", "candidate_count": len(candidates_out)},
        )


intake_service = IntakeService()
