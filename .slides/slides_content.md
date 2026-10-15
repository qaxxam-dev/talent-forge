# TalentForge — 12-Slide Pitch Deck Content

> **Project:** TalentForge  
> **Team Name:** AlqaTech  
> **Team Members:** Izzadhin Al Qassam A S, Hanadi Al Jaradath A S  
> **Live Demo:** [talentforge.alqatech.in](https://talentforge.alqatech.in)  
> **Format:** Strict 5-Minute Pitch | 12-Slide Fixed Sequence (Prosculpt Hackathon Template)

---

## Slide 01: Team & Big Idea

- **Eyebrow:** 01 · TEAM & BIG IDEA
- **Title:** TalentForge.
- **One-Sentence Solution:** Async Code-Defend Verification Layer for High-Volume Technical Hiring.
- **Team Members (Team AlqaTech):**
  - **Izzadhin Al Qassam A S** (Tech Track)
    - *Department:* SMIT · Department of MBA in AI & Data Science
    - *Responsibilities:* Full-Stack Architecture · PII Redaction Pipeline · Gemini AI Integration
  - **Hanadi Al Jaradath A S** (Business Track)
    - *Department:* Department of BSc Computer Science
    - *Responsibilities:* Staffing Agency Channels · Campus Placement Rollout · Financial Modeling
- **Tagline:** Turn 500 CVs into 20 verified candidates who defended their code.
- **Live Demo Link:** `talentforge.alqatech.in`

---

## Slide 02: Problem Statement

- **Eyebrow:** 02 · PROBLEM STATEMENT
- **Headline:** The strongest signal in technical hiring doesn't scale.
- **Key Problem Drivers:**
  - **The 500-CV Flood:** Hundreds of applications arrive for every campus drive — recruiters drown in volume with 48 hours to shortlist.
  - **The AI Illusion:** Resumes and GitHub portfolios are easily inflated with generative AI without candidate comprehension.
  - **The Engineering Drain:** Senior engineers spend 100+ hours interviewing candidates who collapse under basic technical probing.
  - **The Evaluation Gap:** Non-technical recruiters lack engineering bandwidth to verify code authenticity before client interviews.
- **Core Metrics:**
  - **500+** Applications per campus drive. Recruiter screens them in under 48 hours.
  - **60% failure rate** in round-1 tech screens due to unverified code comprehension.
- **Source:** Industry estimate from Indian campus drive volumes, 2024–2026.

---

## Slide 03: Target Users & Validation *(Business Emphasis)*

- **Eyebrow:** 03 · TARGET USERS & VALIDATION (BUSINESS EMPHASIS)
- **Headline:** Validated with placement cells and tech recruiters.
- **Primary Users:**
  - **Campus Placement Cells:** Need higher offer conversion rates to attract Tier-1 recruiters.
  - **Tech Staffing Agencies (CIEL, TeamLease):** Billing depends on fast, credible candidate shortlists.
  - **Enterprise Recruiters:** Need objective evidence before booking senior engineer time.
- **Validated Pain Points:**
  - **80% of screening time** spent wading through generic, AI-generated resumes.
  - **3 out of 5 forwarded candidates** fail basic code comprehension tests.
  - **Zero tooling** for non-technical recruiters to audit GitHub repos before client review.
- **Findings vs Assumptions:**
  - *Assumption:* Coders reject video or viva filters.  
    **Finding:** Candidates strongly prefer a 5-min repo defense over generic LeetCode puzzles.
  - *Assumption:* ATS platforms will build this.  
    **Finding:** ATS platforms are workflow databases, not code intelligence engines.
- **Customer Demand Defense:** Recruiters pay to cut screening hours; placement cells adopt to boost student placement conversion.

---

## Slide 04: Proposed Solution

- **Eyebrow:** 04 · PROPOSED SOLUTION
- **Headline:** Verify technical work in 3 simple steps.
- **User Journey (3 Steps):**
  1. **01 · Ingest & Strip PII:** Recruiters upload candidate repo URLs. Our pipeline automatically scrubs personal identifiers (names, college, gender) for bias-free, DPDP-compliant screening.
  2. **02 · Async Code-Defend Viva:** Backend parses actual repo AST and commits to generate 3 targeted architectural trade-off questions. Candidate explains the decisions behind their own code.
  3. **03 · Dossier & Authorship Seal:** Recruiter receives an executive Day-Zero score, explanation transcript, and an immutable cryptographic SHA-256 seal. Ready to forward to hiring managers.
- **Unique Value Proposition (UVP):** Defend your code before the interview. Recruiters save 80% screening time.

---

## Slide 05: Prototype / Demo *(Tech Track)*

- **Eyebrow:** 05 · PROTOTYPE / DEMO (TECH TRACK)
- **Headline:** Working prototype. Tested end-to-end.
- **Feature Status:**
  - **Built Today · Live:**
    - ✔ DPDP PII Anonymization (Regex/NLP)
    - ✔ GitHub AST & File Tree Extractor
    - ✔ Code-Defend Viva Engine (Voice + Text)
    - ✔ SHA-256 Tamper-Proof Seal Generator
    - ✔ Recruiter Evaluation Dossier Export
  - **Partially Built:**
    - ⚡ Async Batch Worker Queue (for 500+ drives)
    - ⚡ Multi-File Semantic Diff Analysis
    - ⚡ Custom Rubric Builder for specialized tech stacks
  - **Planned Next:**
    - → Native ATS Webhooks (Greenhouse, Lever, Darwinbox)
    - → Async Recruiter Video Playback
    - → Candidate LinkedIn Credentialing
- **Live Switch Demo:** `🔴 LIVE SWITCH DEMO: talentforge.alqatech.in` (Switching to live application instance for demonstration)

---

## Slide 06: Technical Architecture *(Tech Track)*

- **Eyebrow:** 06 · TECHNICAL ARCHITECTURE (TECH TRACK)
- **Headline:** Lean, event-driven micro-pipeline.
- **4-Stage Architecture Pipeline:**
  - **01 · CLIENT:** React 19 SPA (Vite + TailwindCSS · Web Speech API for viva · Deterministic typed fallback mode)
  - **02 · GATEWAY:** FastAPI Core (Async Python gateway · Token bucket rate limiter · Pydantic v2 strict schemas)
  - **03 · PRIVACY:** PII Redaction (Local Regex/NLP scrubber · Ephemeral RAM parsing · DPDP Act 2023 compliant)
  - **04 · AI & SEAL:** Gemini + Seal (Gemini Flash reasoning · Sub-second response · SHA-256 tamper seal)
- **Data Flow:**
  `GitHub Repo Ingest` → `Local PII Stripping` → `Gemini Viva Prompt` → `Candidate Audio Defense` → `SHA-256 Seal Hash`

---

## Slide 07: Build Evidence & Engineering *(Tech Track)*

- **Eyebrow:** 07 · BUILD EVIDENCE & ENGINEERING (TECH TRACK)
- **Headline:** 24-hour sprint velocity & original modules.
- **Engineering Breakdown:**
  - **Original Work Built:**
    - Proprietary PII Scrubber (`core/pii.py`) built for Indian resume formats.
    - Code-Defend Viva Generator: Synthesizes questions strictly from candidate commits.
    - Cryptographic Authorship Seal: Hash combining candidate defense + timestamp.
  - **Reused Libraries:**
    - FastAPI & Uvicorn: High-performance async microservice pipeline.
    - Google Gemini Python SDK: Ultra-fast reasoning & sub-second JSON outputs.
    - TailwindCSS + React Router: Ultra-lean 85KB client bundle.
  - **Sprint Challenge Solved:**
    - *Hurdle:* Voice transcription drop-offs due to varied Indian regional accents during live viva.
    - *Engineered Fix:* Instant deterministic typed fallback mode that activates without stopping test timers or sacrificing signal.
- **Engineering Sprint Metric:** 1,400+ lines of clean Python/TypeScript committed · Zero external interview SaaS dependencies.

---

## Slide 08: Security, Privacy & Scale *(Tech Track)*

- **Eyebrow:** 08 · SECURITY, PRIVACY & SCALE (TECH TRACK)
- **Headline:** DPDP Act compliant. Zero long-term PII.
- **Governance Pillars:**
  - **Data Protection (DPDP 2023):**
    - DPDP Act 2023 Compliant: Privacy by design for all candidate data.
    - Zero Persistent PII: Names, emails, and phone numbers scrubbed before inference.
    - Ephemeral Parsing: Repositories analyzed in RAM and purged immediately.
  - **Adversarial Resilience:**
    - Prompt-Injection Defense: Sanitizes malicious code inside repo README files.
    - Strict Schema Guards: All model outputs parsed via strict Pydantic schemas.
    - Cryptographic Audit: Immutable hash prevents post-hoc tampering.
  - **Scale & Human Control:**
    - Human-in-the-Loop: AI provides advisory score; recruiter retains 100% hiring authority.
    - Stateless Concurrency: Built for 500+ batch submissions without memory leaks.
    - Sub-Second Latency: 1.2s average viva question generation.
- **Technical Trade-Off:** Sacrificed multi-file AST depth in exchange for sub-second viva response times.

---

## Slide 09: Market Opportunity & Competitors *(Business Emphasis)*

- **Eyebrow:** 09 · MARKET OPPORTUNITY & COMPETITORS (BUSINESS EMPHASIS)
- **Headline:** $2.1B verification wedge in a $254B IT sector.
- **Market Sizing:**
  - **1.5 Million:** Indian engineering graduates entering hiring funnels annually.
  - **$2.1 Billion:** Global technical screening and assessment TAM.
  - **₹20 Crore ARR:** Capturing just 1% of Indian tech campus verification drives.
- **Competitor Comparison Table:**

  | Solution | Volume | Signal Depth | AI Cheat Risk |
  | :--- | :--- | :--- | :--- |
  | **HackerRank / LeetCode** | High (Thousands) | Low (Textbook math) | High (ChatGPT solves) |
  | **Senior Engineer Screen** | Low (Max 20/wk) | High (Live probing) | Low (Live defense) |
  | **TalentForge** | High (Campus Drives) | High (Defends real repo) | Zero (Unique commit viva) |

- **Defensibility:** Proprietary viva generation keyed to private commit diffs cannot be solved by generic LLMs.

---

## Slide 10: Business Model & GTM *(Business Emphasis)*

- **Eyebrow:** 10 · BUSINESS MODEL & GTM (BUSINESS EMPHASIS)
- **Headline:** 'Attach, don't compete.' B2B verification packages.
- **Commercial Packages & Channels:**
  - **Tier 01 · Transactional (Pay-Per-Verification):**
    - *Price:* ₹500 – ₹800 / candidate
    - *Target:* For tech staffing firms and boutique headhunters verifying candidate shortlists on demand.
  - **Tier 02 · Drive Bundle (Campus Drive Pass):**
    - *Price:* ₹25,000 / drive
    - *Scope:* Covers up to 200 candidates per campus drive. Tailored for placement cells and high-volume recruiters.
  - **Distribution Wedge (Channel Partnerships):**
    - *Staffing Agencies:* CIEL, TeamLease.
    - *Campus Placement Cells:* SMIT & regional engineering drives.
    - *Sales Funnel:* 1 free pilot drive → 80% screening time saved → Annual contract conversion.
- **ROI Metric:** Staffing agencies recover full drive cost on their very first placement by saving 80+ engineering hours.

---

## Slide 11: Financial Model & Team Cost *(Business Emphasis)*

- **Eyebrow:** 11 · FINANCIAL MODEL & TEAM COST (BUSINESS EMPHASIS)
- **Headline:** 95% gross margin. Cash-flow positive at 8 drives.
- **Financial Architecture:**
  - **Unit Economics (Per Candidate):**
    - Revenue per eval: ₹500
    - Gemini Flash Token: ₹15
    - Speech & Server compute: ₹10
    - **Gross Margin: 95% (₹475)**
  - **6-Month Pilot Budget:**
    - Server & Domain: ₹30,000
    - Campus Outreach & Ops: ₹50,000
    - Contingency Reserve: ₹1,00,000
    - **Total Runway: ₹1.80 Lakhs**
  - **Break-Even & Roles:**
    - **Break-Even Point:** 8 campus drives (or 400 candidate dossiers).
    - **Izzadhin:** Engineering, AI Architecture & Platform Security.
    - **Hanadi:** Partner Operations, GTM & Placement Coordinator Outreach.
- **Financial Assumptions:** ₹15 Gemini Flash API + ₹10 infra per candidate; 8 drives to achieve full cash-flow positive operations.

---

## Slide 12: Roadmap, Ask & Closing

- **Eyebrow:** 12 · ROADMAP, ASK & CLOSING
- **Headline:** 30/60/90 milestones. 2 campus pilots ask.
- **Milestones:**
  - **30 Days · Pilot (2 Live Campus Drives):** Deploy across 300+ students. Benchmark recruiter screening time reduction and interview pass rates.
  - **60 Days · Product (Recruiter Portal):** Self-serve recruiter dashboard with async video defense playback and integrity timestamps.
  - **90 Days · Integrate (ATS Connectors):** Native webhook integrations into Greenhouse, Lever, and Darwinbox to automate dossier delivery.
- **The Ask Today:**
  - **2 Campus Placement Partnerships & HR Mentorship**
  - **Team AlqaTech Contact:** `qassam@alqatech.in` · `+91 70107 46690`
- **Closing Punchline:**
  > *"Stop trusting inflated resumes. Make candidates defend their code with TalentForge."*
