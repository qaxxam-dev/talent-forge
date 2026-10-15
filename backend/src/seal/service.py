from typing import Dict, Optional
import hashlib
import json
from datetime import datetime, timezone
from src.seal.schemas import AuthorshipSealData, CreateSealRequest, VerificationLookupData


class SealService:
    def __init__(self):
        self._cache: Dict[str, VerificationLookupData] = {}
        # Pre-seed demo verification record for Aarav Sharma
        demo_id = "TF-VERIFY-20261012-8821"
        self._cache[demo_id] = VerificationLookupData(
            verification_id=demo_id,
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
        )
        # Also pre-seed TF-SEAL-20261014-07C9F054
        demo_seal = "TF-SEAL-20261014-07C9F054"
        self._cache[demo_seal] = VerificationLookupData(
            verification_id=demo_seal,
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
        )

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

        lookup_data = VerificationLookupData(
            verification_id=verification_id,
            content_hash=content_hash,
            timestamp=timestamp_str,
            algorithm="SHA-256",
            candidate_name=request.candidate_name,
            target_role=request.target_role,
            status="VERIFIED",
            verified_skills=["Backend Engineering", "Code Defense"],
            verified_tasks=request.verified_tasks,
            viva_marks=request.viva_marks,
            day_zero_score=88,
            audit_summary=audit_summary,
        )
        self._cache[verification_id] = lookup_data

        return seal_data, {
            "algorithm": "SHA-256",
            "canonical_bytes": len(serialized.encode("utf-8")),
            "minted_at": timestamp_str,
        }

    def get_verification(self, verification_id: str) -> Optional[VerificationLookupData]:
        vid = verification_id.strip()
        # Direct lookup or case-insensitive match
        for key, val in self._cache.items():
            if key.upper() == vid.upper():
                return val
        return None


seal_service = SealService()

