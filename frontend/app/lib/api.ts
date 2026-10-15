import type { RedactedToken, SkillGapAnalysis } from "@/stores/sessionStore";

export interface APIError {
  code?: string;
  message: string;
}

export interface APIResponse<T> {
  success: boolean;
  data: T | null;
  error: APIError | string | null;
  meta: Record<string, any> | null;
}

export interface IntakeRequestPayload {
  resume_text: string;
  job_description: string;
  candidate_name?: string | null;
  location?: string | null;
  github_url?: string | null;
}

export interface IntakeResponseData {
  sanitized_resume: string;
  redacted_fields: RedactedToken[];
  skill_gap_analysis: SkillGapAnalysis;
  suggested_path: "kanban" | "repo";
}

export interface ParseResumeResponse {
  raw_text: string;
  detected_name?: string | null;
  detected_email?: string | null;
  detected_phone?: string | null;
  detected_github?: string | null;
  file_name: string;
  word_count: number;
}

export class ApiClientError extends Error {
  status: number;
  code?: string;
  retryAfterSeconds?: number;

  constructor(message: string, status: number, code?: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

async function fetchJson<T>(url: string, options: RequestInit): Promise<APIResponse<T>> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    },
  });

  if (response.status === 429) {
    const retryHeader = response.headers.get("Retry-After");
    const retrySeconds = retryHeader ? parseInt(retryHeader, 10) : 60;
    throw new ApiClientError(
      `Rate limit exceeded. Please wait ${retrySeconds}s before retrying.`,
      429,
      "RATE_LIMIT_EXCEEDED",
      retrySeconds
    );
  }

  let json: APIResponse<T>;
  try {
    json = await response.json();
  } catch (err) {
    throw new ApiClientError(
      `Invalid server response (${response.status})`,
      response.status,
      "INVALID_RESPONSE"
    );
  }

  if (!response.ok || !json.success) {
    const errVal = json?.error as any;
    const message =
      typeof errVal === "string"
        ? errVal
        : errVal?.message || `Request failed with status ${response.status}`;
    const code = typeof errVal === "object" && errVal?.code ? errVal.code : "HTTP_ERROR";
    throw new ApiClientError(message, response.status, code);
  }

  return json;
}

export interface ProjectChallengePayload {
  title: string;
  problem_statement: string;
  tech_stack_focus?: string | null;
}

export interface GenerateSpecPayload {
  skill_gap_analysis: SkillGapAnalysis;
  role_title?: string;
  job_description: string;
  project_challenge?: ProjectChallengePayload | null;
  prior_verification?: {
    verification_id: string;
    verified_at?: string;
    candidate_name?: string;
    target_role?: string;
    verified_skills: string[];
    verified_deliverables: string[];
  } | null;
}


export interface GenerateSpecResponseData {
  project_challenge: {
    title: string;
    problem_statement: string;
    tech_stack_focus?: string;
  };
  tasks: any[];
  evidence_summary: string;
}

export interface GenerateVivaPayload {
  role_title: string;
  job_description?: string | null;
  evidence_summary: string;
  claimed_artifacts: string[];
}

export interface GenerateVivaResponseData {
  questions: any[];
  defense_guidance: string;
}

export interface EvaluateDefensePayload {
  question: any;
  transcript: string;
  delivery_mode?: "voice" | "typed_fallback";
  recruiter_mark?: "adequate" | "weak" | "none" | null;
  is_final_question?: boolean;
  previous_turns?: any[] | null;
}

export interface EvaluateDefenseResponseData {
  question_id: string;
  score: number;
  suggested_mark: "adequate" | "weak" | "none";
  rationale: string;
  rubric_coverage: any[];
  dynamic_follow_up?: any | null;
}

export const api = {
  async intake(payload: IntakeRequestPayload): Promise<IntakeResponseData> {
    const res = await fetchJson<IntakeResponseData>("/v1/intake", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.data) {
      throw new ApiClientError("Missing response data from intake endpoint", 500);
    }
    return res.data;
  },

  async parseResumeFile(file: File): Promise<ParseResumeResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/v1/parse-resume", {
      method: "POST",
      body: formData,
    });

    if (response.status === 429) {
      throw new ApiClientError("Rate limit exceeded while uploading resume", 429);
    }

    let json: any;
    try {
      json = await response.json();
    } catch {
      throw new ApiClientError(`Server error (${response.status})`, response.status);
    }

    if (!response.ok || !json.success || !json.data) {
      const msg = json.error?.message || json.error || "Failed to parse resume document";
      throw new ApiClientError(msg, response.status);
    }

    return json.data;
  },

  async generateSpec(payload: GenerateSpecPayload): Promise<GenerateSpecResponseData> {
    const res = await fetchJson<GenerateSpecResponseData>("/v1/generate-spec", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.data) {
      throw new ApiClientError("Missing response data from generate-spec endpoint", 500);
    }
    return res.data;
  },

  async generateViva(payload: GenerateVivaPayload): Promise<GenerateVivaResponseData> {
    const res = await fetchJson<GenerateVivaResponseData>("/v1/generate-viva", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.data) {
      throw new ApiClientError("Missing response data from generate-viva endpoint", 500);
    }
    return res.data;
  },

  async evaluateDefense(payload: EvaluateDefensePayload): Promise<EvaluateDefenseResponseData> {
    const res = await fetchJson<EvaluateDefenseResponseData>("/v1/evaluate-defense", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.data) {
      throw new ApiClientError("Missing response data from evaluate-defense endpoint", 500);
    }
    return res.data;
  },

  async batchIntake(payload: {
    job_description: string;
    candidates?: any[];
    use_campus_drive_preset?: boolean;
  }): Promise<{
    job_description: string;
    total_processed: number;
    shortlist_count: number;
    candidates: any[];
  }> {
    const res = await fetchJson<any>("/v1/batch-intake", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.data) {
      throw new ApiClientError("Missing response data from batch-intake endpoint", 500);
    }
    return res.data;
  },

  async analyzeRepo(payload: {
    github_url: string;
    job_description?: string;
    candidate_name?: string;
  }): Promise<any> {
    const res = await fetchJson<any>("/v1/analyze-repo", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.data) {
      throw new ApiClientError("Missing response data from analyze-repo endpoint", 500);
    }
    return res.data;
  },

  async createSeal(payload: {
    candidate_id: string;
    candidate_name: string;
    target_role: string;
    verified_tasks: string[];
    viva_marks: string[];
    github_url?: string;
  }): Promise<any> {
    const res = await fetchJson<any>("/v1/create-seal", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.data) {
      throw new ApiClientError("Missing response data from create-seal endpoint", 500);
    }
    return res.data;
  },

  async generateDossier(payload: {
    candidate_id: string;
    candidate_name: string;
    target_role: string;
    match_percentage: number;
    verified_tasks: string[];
    viva_marks: string[];
    remaining_gaps: any[];
    seal?: any;
  }): Promise<any> {
    const res = await fetchJson<any>("/v1/generate-dossier", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.data) {
      throw new ApiClientError("Missing response data from generate-dossier endpoint", 500);
    }
    return res.data;
  },

  async verifyLookup(verificationId: string): Promise<any> {
    const res = await fetchJson<any>(`/v1/verify/${encodeURIComponent(verificationId.trim())}`, {
      method: "GET",
    });
    if (!res.data) {
      throw new ApiClientError((res as any)?.error || "Verification record not found", 404);
    }
    return res.data;
  },
};


