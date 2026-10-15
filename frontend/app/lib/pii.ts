export type RedactionType = "NAME" | "LOCATION" | "EMAIL" | "PHONE" | "LINK";

export interface RedactedToken {
  type: RedactionType;
  raw: string;
  token: string;
}

export interface SanitizeResult {
  sanitizedText: string;
  redactedTokens: RedactedToken[];
}

const TOKENS: Record<RedactionType, string> = {
  NAME: "[REDACTED_CANDIDATE_NAME]",
  LOCATION: "[REDACTED_LOCATION]",
  EMAIL: "[REDACTED_EMAIL_ADDRESS]",
  PHONE: "[REDACTED_PHONE_NUMBER]",
  LINK: "[REDACTED_PROFILE_LINK]",
};

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const LINK_RE = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s,;)]*/gi;
const PHONE_CANDIDATE_RE = /\+?\d[\d\s().-]{8,}\d/g;

const MIN_RESUME_WORDS = 25;
const MIN_JOB_WORDS = 15;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function identifierTerms(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[,\n]/)
    .flatMap((part) => {
      const trimmed = part.trim();
      return [trimmed, ...trimmed.split(/\s+/)];
    })
    .filter((term) => term.length >= 3);
}

function identifierPattern(terms: string[]): RegExp | null {
  const unique = [...new Set(terms)].sort((a, b) => b.length - a.length);
  if (unique.length === 0) return null;
  return new RegExp(`\\b(?:${unique.map(escapeRegExp).join("|")})\\b`, "gi");
}

export function sanitizeText(
  text: string,
  identifiers: { name?: string; location?: string } = {}
): SanitizeResult {
  const registry = new Map<string, RedactedToken>();
  const replaceWith = (type: RedactionType, raw: string) => {
    const key = `${type}:${raw.toLowerCase()}`;
    if (!registry.has(key)) registry.set(key, { type, raw, token: TOKENS[type] });
    return TOKENS[type];
  };

  let out = text.replace(EMAIL_RE, (match) => replaceWith("EMAIL", match));
  out = out.replace(LINK_RE, (match) => replaceWith("LINK", match));
  out = out.replace(PHONE_CANDIDATE_RE, (match) => {
    const digits = match.replace(/\D/g, "").length;
    return digits >= 10 && digits <= 13 ? replaceWith("PHONE", match) : match;
  });

  const namePattern = identifierPattern(identifierTerms(identifiers.name));
  if (namePattern) out = out.replace(namePattern, (match) => replaceWith("NAME", match));

  const locationPattern = identifierPattern(identifierTerms(identifiers.location));
  if (locationPattern) out = out.replace(locationPattern, (match) => replaceWith("LOCATION", match));

  return { sanitizedText: out, redactedTokens: [...registry.values()] };
}

export function validateResumeText(text: string): string | null {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter((word) => /[A-Za-z]{2,}/.test(word));
  if (words.length < MIN_RESUME_WORDS) {
    return `Please enter a candidate resume or profile text with at least ${MIN_RESUME_WORDS} words.`;
  }
  return null;
}

export function validateJobText(text: string): string | null {
  const words = text.trim().split(/\s+/).filter((word) => word.length > 0);
  if (words.length < MIN_JOB_WORDS) {
    return `Please enter the job description or role requirements (at least ${MIN_JOB_WORDS} words).`;
  }
  return null;
}

const GITHUB_REPO_RE = /^https?:\/\/(www\.)?github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/i;

export function isGithubRepoUrl(url: string): boolean {
  return GITHUB_REPO_RE.test(url.trim());
}
