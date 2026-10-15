export interface ChallengePreset {
  id: string;
  title: string;
  tagline: string;
  problemStatement: string;
  techStackFocus: string;
}

export const INDUSTRY_CHALLENGE_PRESETS: ChallengePreset[] = [
  {
    id: "fintech-ledger",
    title: "Idempotent Transactional Ledger & Webhook Engine",
    tagline: "High-integrity financial balance reconciliation and distributed locking",
    problemStatement:
      "Architect a multi-tenant payment reconciliation engine that ingests asynchronous financial webhook events, enforces exactly-once processing via idempotency tokens, and maintains an immutable dual-entry ledger with concurrency-safe row-level locking in PostgreSQL.",
    techStackFocus: "FastAPI, PostgreSQL 16, Redis, Docker, Pytest",
  },
  {
    id: "event-stream",
    title: "High-Throughput Distributed Telemetry Ingestion Pipeline",
    tagline: "Event stream partitioning, buffering, and dead-letter queue recovery",
    problemStatement:
      "Build a high-volume event ingestion service capable of processing 10,000 events/sec, buffering through partitioned message queues, detecting out-of-order deliveries, and routing corrupted payloads to a persistent dead-letter queue with exponential backoff.",
    techStackFocus: "FastAPI, Kafka / RabbitMQ, Async Workers, PostgreSQL, Pytest",
  },
  {
    id: "billing-metering",
    title: "Multi-Tenant Metered Usage & Subscription Billing Service",
    tagline: "Usage aggregation under concurrent burst requests with strict SLA",
    problemStatement:
      "Design a metered usage billing microservice that aggregates API consumption metrics across enterprise tenants in real-time, avoids write-lock saturation using sliding time-windows, and triggers automated invoice generation with idempotency keys.",
    techStackFocus: "Python 3.12+, FastAPI, Redis Cache-Aside, PostgreSQL MVCC",
  },
  {
    id: "task-orchestrator",
    title: "Resilient Distributed Task Orchestrator & Worker Pool",
    tagline: "Heartbeat monitoring, lease expiration, and graceful worker failover",
    problemStatement:
      "Implement a distributed task execution engine that dispatches long-running background jobs across worker pools, tracks liveness via distributed heartbeats, reclaims orphaned jobs upon worker crashes, and exposes structured health metrics.",
    techStackFocus: "Python, Asyncio, Granian, Redis Pub/Sub, Docker Compose",
  },
];
