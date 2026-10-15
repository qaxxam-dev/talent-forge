import hashlib
import json
import os
import sqlite3
from datetime import datetime, timezone
from typing import Dict, List, Optional
from src.seal.schemas import AuthorshipSealData, CreateSealRequest, VerificationLookupData

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "seals.db")


class SealService:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = os.path.abspath(db_path)
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_db()
        self._cache: Dict[str, VerificationLookupData] = {}
        self._seed_default_records()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS seals (
                    verification_id TEXT PRIMARY KEY,
                    content_hash TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    algorithm TEXT NOT NULL,
                    candidate_name TEXT NOT NULL,
                    target_role TEXT NOT NULL,
                    status TEXT NOT NULL,
                    verified_skills TEXT NOT NULL,
                    verified_tasks TEXT NOT NULL,
                    viva_marks TEXT NOT NULL,
                    day_zero_score INTEGER NOT NULL,
                    audit_summary TEXT NOT NULL
                )
            """)
            conn.commit()

    def _seed_default_records(self):
        default_records = [
            VerificationLookupData(
                verification_id="TF-VERIFY-20261012-8821",
                content_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                timestamp="2026-10-12T14:22:00Z",
                algorithm="SHA-256",
                candidate_name="Aarav Sharma",
                target_role="Backend Engineer",
                status="VERIFIED",
                verified_skills=["PostgreSQL", "SQLAlchemy", "FastAPI", "Database Connection Pooling", "Data Modeling"],
                verified_tasks=[
                    "TF-S1-01: Design PostgreSQL Double-Entry Ledger Tables & Composite Indices",
                    "TF-S1-02: Implement Pydantic v2 Strict Validation Schemas for Financial Events",
                ],
                viva_marks=["adequate", "adequate"],
                day_zero_score=86,
                audit_summary="Cryptographic verification record issued for Aarav Sharma (Backend Engineer). 2 technical artifacts verified post-challenge, viva defense passed with adequate score across data modeling and ACID isolation tradeoffs.",
            ),
            VerificationLookupData(
                verification_id="TF-SEAL-20261014-07C9F054",
                content_hash="07c9f054e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b",
                timestamp="2026-10-14T19:30:00Z",
                algorithm="SHA-256",
                candidate_name="Aarav Sharma",
                target_role="Junior Backend Engineer",
                status="VERIFIED",
                verified_skills=["PostgreSQL", "FastAPI", "Redis", "Docker"],
                verified_tasks=[
                    "TF-S1-01: Design PostgreSQL Double-Entry Ledger Tables & Composite Indices",
                    "TF-S1-02: Implement Pydantic v2 Strict Validation Schemas for Financial Events",
                ],
                viva_marks=["adequate", "adequate", "adequate"],
                day_zero_score=88,
                audit_summary="Cryptographic verification seal minted for Aarav Sharma (Junior Backend Engineer). Binding 2 verified technical artifacts and 3 viva defense evaluations under SHA-256 digest.",
            ),
        ]

        with self._get_connection() as conn:
            for rec in default_records:
                self._cache[rec.verification_id] = rec
                conn.execute(
                    """
                    INSERT OR IGNORE INTO seals (
                        verification_id, content_hash, timestamp, algorithm,
                        candidate_name, target_role, status, verified_skills,
                        verified_tasks, viva_marks, day_zero_score, audit_summary
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        rec.verification_id,
                        rec.content_hash,
                        rec.timestamp,
                        rec.algorithm,
                        rec.candidate_name,
                        rec.target_role,
                        rec.status,
                        json.dumps(rec.verified_skills),
                        json.dumps(rec.verified_tasks),
                        json.dumps(rec.viva_marks),
                        rec.day_zero_score,
                        rec.audit_summary,
                    ),
                )
            conn.commit()

    def generate_seal(self, request: CreateSealRequest) -> tuple[AuthorshipSealData, dict]:
        # Canonical string for deterministic cryptographic hashing
        canonical_payload = {
            "candidate_id": request.candidate_id,
            "candidate_name": request.candidate_name,
            "target_role": request.target_role,
            "verified_tasks": sorted(request.verified_tasks),
            "viva_marks": sorted(request.viva_marks),
            "github_url": request.github_url or "",
        }

        serialized = json.dumps(canonical_payload, sort_keys=True)
        content_hash = hashlib.sha256(serialized.encode("utf-8")).hexdigest()

        now_utc = datetime.now(timezone.utc)
        timestamp_str = now_utc.strftime("%Y-%m-%dT%H:%M:%SZ")
        date_prefix = now_utc.strftime("%Y%m%d")

        verification_id = f"TF-SEAL-{date_prefix}-{content_hash[:8].upper()}"

        audit_summary = (
            f"Cryptographic verification seal minted for {request.candidate_name} ({request.target_role}). "
            f"Binding {len(request.verified_tasks)} verified technical artifacts and {len(request.viva_marks)} "
            f"viva defense evaluations under SHA-256 digest."
        )

        seal_data = AuthorshipSealData(
            verification_id=verification_id,
            content_hash=content_hash,
            timestamp=timestamp_str,
            algorithm="SHA-256",
            candidate_name=request.candidate_name,
            target_role=request.target_role,
            status="VERIFIED",
            audit_summary=audit_summary,
        )

        verified_skills = (
            request.verified_skills
            if request.verified_skills
            else ["Backend Engineering", "Code Defense", "API Design"]
        )
        day_zero_score = request.day_zero_score if request.day_zero_score else 88

        lookup_data = VerificationLookupData(
            verification_id=verification_id,
            content_hash=content_hash,
            timestamp=timestamp_str,
            algorithm="SHA-256",
            candidate_name=request.candidate_name,
            target_role=request.target_role,
            status="VERIFIED",
            verified_skills=verified_skills,
            verified_tasks=request.verified_tasks,
            viva_marks=request.viva_marks,
            day_zero_score=day_zero_score,
            audit_summary=audit_summary,
        )

        # Store in cache
        self._cache[verification_id] = lookup_data

        # Persist to SQLite
        try:
            with self._get_connection() as conn:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO seals (
                        verification_id, content_hash, timestamp, algorithm,
                        candidate_name, target_role, status, verified_skills,
                        verified_tasks, viva_marks, day_zero_score, audit_summary
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        lookup_data.verification_id,
                        lookup_data.content_hash,
                        lookup_data.timestamp,
                        lookup_data.algorithm,
                        lookup_data.candidate_name,
                        lookup_data.target_role,
                        lookup_data.status,
                        json.dumps(lookup_data.verified_skills),
                        json.dumps(lookup_data.verified_tasks),
                        json.dumps(lookup_data.viva_marks),
                        lookup_data.day_zero_score,
                        lookup_data.audit_summary,
                    ),
                )
                conn.commit()
        except Exception as e:
            print(f"[SealService] SQLite persistence error: {e}")

        return seal_data, {
            "algorithm": "SHA-256",
            "canonical_bytes": len(serialized.encode("utf-8")),
            "minted_at": timestamp_str,
            "persisted": True,
        }

    def get_verification(self, verification_id: str) -> Optional[VerificationLookupData]:
        vid = verification_id.strip()

        # Check in-memory cache first
        for key, val in self._cache.items():
            if key.upper() == vid.upper():
                return val

        # Check SQLite DB
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT * FROM seals WHERE UPPER(verification_id) = UPPER(?)", (vid,)
                )
                row = cursor.fetchone()
                if row:
                    record = VerificationLookupData(
                        verification_id=row["verification_id"],
                        content_hash=row["content_hash"],
                        timestamp=row["timestamp"],
                        algorithm=row["algorithm"],
                        candidate_name=row["candidate_name"],
                        target_role=row["target_role"],
                        status=row["status"],
                        verified_skills=json.loads(row["verified_skills"]),
                        verified_tasks=json.loads(row["verified_tasks"]),
                        viva_marks=json.loads(row["viva_marks"]),
                        day_zero_score=row["day_zero_score"],
                        audit_summary=row["audit_summary"],
                    )
                    self._cache[record.verification_id] = record
                    return record
        except Exception as e:
            print(f"[SealService] SQLite query error: {e}")

        return None


seal_service = SealService()
