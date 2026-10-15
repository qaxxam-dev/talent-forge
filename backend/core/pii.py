import re
from typing import List, Optional
from pydantic import BaseModel


class RedactedToken(BaseModel):
    type: str  # NAME | LOCATION | EMAIL | PHONE | LINK
    raw: str
    token: str


class SanitizeResult(BaseModel):
    sanitized_text: str
    redacted_tokens: List[RedactedToken]


TOKENS = {
    "NAME": "[REDACTED_CANDIDATE_NAME]",
    "LOCATION": "[REDACTED_LOCATION]",
    "EMAIL": "[REDACTED_EMAIL_ADDRESS]",
    "PHONE": "[REDACTED_PHONE_NUMBER]",
    "LINK": "[REDACTED_PROFILE_LINK]",
}

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
LINK_RE = re.compile(r"(?:https?://)?(?:www\.)?linkedin\.com/[^\s,;)]*", re.IGNORECASE)
PHONE_RE = re.compile(r"\+?\d[\d\s().-]{8,}\d")


def sanitize_text(
    text: str,
    candidate_name: Optional[str] = None,
    location: Optional[str] = None,
) -> SanitizeResult:
    """
    Strips candidate PII before processing, satisfying DPDP Act 2023 Section 8.
    """
    registry: dict[str, RedactedToken] = {}

    def replace_with(token_type: str, raw_val: str) -> str:
        key = f"{token_type}:{raw_val.lower()}"
        if key not in registry:
            registry[key] = RedactedToken(
                type=token_type,
                raw=raw_val,
                token=TOKENS[token_type],
            )
        return TOKENS[token_type]

    # Redact email addresses
    out = EMAIL_RE.sub(lambda m: replace_with("EMAIL", m.group(0)), text)

    # Redact LinkedIn / profile links
    out = LINK_RE.sub(lambda m: replace_with("LINK", m.group(0)), out)

    # Redact phone numbers (10 to 13 digits)
    def phone_replacer(m: re.Match) -> str:
        digits = re.sub(r"\D", "", m.group(0))
        if 10 <= len(digits) <= 13:
            return replace_with("PHONE", m.group(0))
        return m.group(0)

    out = PHONE_RE.sub(phone_replacer, out)

    # Redact candidate name terms if provided
    if candidate_name:
        terms = [
            t.strip()
            for part in re.split(r"[,\n]", candidate_name)
            for t in [part.strip(), *part.strip().split()]
            if len(t.strip()) >= 3
        ]
        unique_terms = sorted(list(set(terms)), key=len, reverse=True)
        if unique_terms:
            pattern = re.compile(
                r"\b(?:" + "|".join(re.escape(t) for t in unique_terms) + r")\b",
                re.IGNORECASE,
            )
            out = pattern.sub(lambda m: replace_with("NAME", m.group(0)), out)

    # Redact location terms if provided
    if location:
        loc_terms = [
            t.strip()
            for part in re.split(r"[,\n]", location)
            for t in [part.strip(), *part.strip().split()]
            if len(t.strip()) >= 3
        ]
        unique_locs = sorted(list(set(loc_terms)), key=len, reverse=True)
        if unique_locs:
            loc_pattern = re.compile(
                r"\b(?:" + "|".join(re.escape(t) for t in unique_locs) + r")\b",
                re.IGNORECASE,
            )
            out = loc_pattern.sub(lambda m: replace_with("LOCATION", m.group(0)), out)

    return SanitizeResult(
        sanitized_text=out,
        redacted_tokens=list(registry.values()),
    )
