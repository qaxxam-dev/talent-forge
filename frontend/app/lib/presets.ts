export interface DemoPreset {
  candidateName: string;
  location: string;
  resumeText: string;
  jobDescription: string;
  githubUrl: string;
}

export const DEMO_PRESET_BACKEND: DemoPreset = {
  candidateName: "Aarav Sharma",
  location: "Bengaluru, India",
  githubUrl: "",
  resumeText: `Aarav Sharma
Bengaluru, Karnataka, India | +91 98765 43210 | aarav.sharma@techmail.com | linkedin.com/in/aarav-sharma-dev

Professional Summary:
Backend Engineer with 3+ years experience designing web services and transactional microservices in Python, Flask, and basic FastAPI. Strong background in relational schema modeling, RESTful API development, and PostgreSQL query optimization. Seeking to transition into Senior Distributed Systems engineering roles.

Technical Skills:
- Languages: Python, SQL, JavaScript (ES6)
- Frameworks & Libraries: FastAPI, Flask, Pydantic, SQLAlchemy, Celery, Pytest
- Databases: PostgreSQL, SQLite, Redis (caching)
- DevOps & Cloud: Docker, Git, Linux, GitHub Actions, AWS EC2

Work Experience:
Software Engineer | FinFlow Technologies (2023 - Present)
- Developed and maintained 15+ REST API endpoints using FastAPI and PostgreSQL handling 2M+ daily requests.
- Implemented Redis cache-aside caching reducing p95 database read latencies by 35%.
- Wrote automated test suites with Pytest achieving 85% code coverage across core billing modules.
- Packaged multi-container microservices using Docker Compose for staging and local development.

Junior Backend Developer | CloudCraft Labs (2021 - 2023)
- Built Flask web hooks for third-party invoice and payment notifications.
- Managed PostgreSQL database schema migrations using Alembic.
- Collaborated with frontend engineers to integrate OpenAPI contracts and swagger documentation.

Education:
B.Tech in Computer Science & Engineering | VTU, Karnataka (2017 - 2021)
`,
  jobDescription: `Role: Senior Backend Engineer — Distributed Systems & Platform
Location: Remote / Hybrid

We are seeking a Senior Backend Engineer to architect, build, and scale our high-throughput transactional ledger platform.

Key Responsibilities:
- Design fault-tolerant, idempotent distributed systems processing asynchronous financial events.
- Implement high-performance async APIs with FastAPI, Granian, and modern Pydantic v2.
- Lead architecture of event-driven pipelines using Apache Kafka or AWS SQS, ensuring strict message ordering and dead-letter queue recovery.
- Optimize deep PostgreSQL transactional queries, table partitioning, and row-level locking for concurrency control.
- Implement distributed tracing, rate limiting, and automated health checks under strict SLA requirements.

Required Capabilities:
- 4+ years of production backend engineering experience with Python.
- Proven expertise in distributed concurrency, idempotency tokens, and event-driven architecture (Kafka/RabbitMQ).
- Deep PostgreSQL database internals knowledge (MVCC, indexing, isolation levels, connection pooling).
- Experience with container orchestration, CI/CD observability, and production SLO/SLA management.
`,
};

export const DEMO_PRIOR_VERIFICATION = {
  verificationId: "TF-VERIFY-20261012-8821",
  candidateName: "Aarav Sharma",
  targetRole: "Backend Engineer",
  verifiedSkills: ["PostgreSQL", "SQLAlchemy", "FastAPI", "Database Connection Pooling", "Data Modeling"],
  verifiedDeliverables: [
    "TF-S1-01: Design PostgreSQL Double-Entry Ledger Tables & Composite Indices",
    "TF-S1-02: Implement Pydantic v2 Strict Validation Schemas for Financial Events",
  ],
  verifiedAt: "2026-10-12T14:22:00Z",
  auditSummary: "2 technical artifacts verified post-challenge, viva defense passed with adequate score across data modeling and ACID isolation tradeoffs.",
};

