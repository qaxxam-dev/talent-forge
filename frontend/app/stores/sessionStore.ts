import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface RedactedToken {
  type: string;
  raw: string;
  token: string;
}

export interface SkillGap {
  name: string;
  severity: "critical" | "high" | "medium";
  explanation: string;
}

export interface SkillGapAnalysis {
  match_percentage: number;
  acquired_skills: string[];
  unsubstantiated_claims?: string[];
  critical_gaps: SkillGap[];
  high_gaps: SkillGap[];
  authenticity_notes?: string;
}

export interface TaskItem {
  id: string;
  sprint: 1 | 2 | 3;
  title: string;
  description: string;
  estimated_hours: number;
  acceptance_criteria: string;
  suggested_path: string;
  status: "open" | "assigned" | "verified" | "pre_verified";
  notes?: string;
  verified_code_snippet?: string;
  verification_score?: number;
  rubric_feedback?: string;
  pre_verified_source?: {
    verification_id: string;
    verified_at?: string;
    role?: string;
    matched_skills?: string[];
  };
}

export interface PriorVerificationData {
  verification_id: string;
  content_hash: string;
  timestamp: string;
  algorithm?: string;
  candidate_name: string;
  target_role: string;
  status: string;
  verified_skills: string[];
  verified_tasks: string[];
  viva_marks?: string[];
  day_zero_score?: number;
  audit_summary: string;
}


export interface RubricItem {
  id: string;
  text: string;
  expected_signal: string;
}

export interface VivaQuestion {
  id: string;
  question_text: string;
  referenced_artifact: string;
  question_type: "architectural" | "tradeoff" | "requirement_mutation" | "adaptive_followup";
  rubric: RubricItem[];
  sample_candidate_answer?: string;
  estimated_duration_seconds?: number;
}

export interface RubricCheck {
  rubric_id: string;
  criterion: string;
  hit: boolean;
  citation: string;
}

export interface VivaAnswerRecord {
  question_id: string;
  transcript: string;
  delivery_mode: "voice" | "typed_fallback";
  score: number;
  suggested_mark: "adequate" | "weak" | "none";
  recruiter_mark: "adequate" | "weak" | "none";
  rationale: string;
  rubric_coverage: RubricCheck[];
  dynamic_follow_up?: VivaQuestion | null;
}

export interface AuthorshipSeal {
  verification_id: string;
  content_hash: string;
  timestamp: string;
  algorithm?: string;
  candidate_name?: string;
  target_role?: string;
  audit_summary?: string;
}

export interface BusinessImpact {
  technical_deliverable: string;
  commercial_value: string;
  risk_mitigated: string;
}

export interface VerificationDossier {
  candidate_label: string;
  role: string;
  day_zero_score: number;
  seal: AuthorshipSeal;
  impacts: BusinessImpact[];
  remaining_gaps: SkillGap[];
  generated_at: string;
  executive_summary?: string;
  ats_export_payload?: Record<string, unknown>;
}

export interface ProjectChallenge {
  title: string;
  problem_statement: string;
  industry_preset?: string;
  tech_stack_focus?: string;
}

export interface RepoFileHighlight {
  path: string;
  language: string;
  relevance_explanation: string;
  code_snippet?: string;
}

export interface CommitForensics {
  total_commits: number;
  single_giant_initial_commit: boolean;
  timestamps_clustered_minutes: boolean;
  is_fork: boolean;
  author_mismatch: boolean;
  forensic_risk_score: "LOW" | "MEDIUM" | "HIGH";
  forensic_summary: string;
}

export interface RepoAnalysisData {
  repo_name: string;
  owner: string;
  stars: number;
  primary_language: string;
  has_sufficient_signal: boolean;
  recommended_path: "repo" | "kanban";
  confidence_score: number;
  reasoning: string;
  key_files: RepoFileHighlight[];
  evidence_summary: string;
  github_url: string;
  commit_forensics?: CommitForensics;
}

export interface BatchCandidate {
  id: string;
  name: string;
  sanitized_name: string;
  email_masked: string;
  match_percentage: number;
  acquired_skills: string[];
  critical_gaps: SkillGap[];
  high_gaps: SkillGap[];
  suggested_shortlist: boolean;
  sanitized_resume: string;
  raw_resume: string;
  location?: string;
  github_url?: string;
  suggested_path: "kanban" | "repo";
}

interface EvaluationSessionState {
  // Screen 1: Batch & Candidate Intake
  isBatchMode: boolean;
  batchCandidates: BatchCandidate[];
  activeCandidateId: string | null;
  candidateName: string;
  location: string;
  resumeText: string;
  jobDescription: string;
  githubUrl: string;

  // Prior Verification Reuse Loop
  priorVerificationId: string;
  priorVerificationData: PriorVerificationData | null;

  // Screen 1 Outputs
  sanitizedResume: string;
  redactedTokens: RedactedToken[];
  skillGapAnalysis: SkillGapAnalysis | null;
  suggestedPath: "kanban" | "repo" | null;

  // Screen 2: Kanban Challenge & Tickets (Path A)
  projectChallenge: ProjectChallenge | null;
  tasks: TaskItem[];
  evidenceSummary: string | null;

  // Screen 2: Repo Analysis (Path B)
  repoAnalysis: RepoAnalysisData | null;
  repoSummary: string | null;

  // Screen 3: Oral Viva
  vivaQuestions: VivaQuestion[];
  vivaAnswers: Record<string, VivaAnswerRecord>;
  vivaConsentGiven: boolean;

  // Screen 4: Cryptographic Seal
  seal: AuthorshipSeal | null;

  // Screen 5: Dossier
  dossier: VerificationDossier | null;

  // Actions
  setIsBatchMode: (isBatch: boolean) => void;
  setBatchCandidates: (candidates: BatchCandidate[]) => void;
  toggleCandidateShortlist: (candidateId: string) => void;
  selectActiveCandidate: (candidateId: string) => void;

  setPriorVerification: (id: string, data: PriorVerificationData | null) => void;

  setIntakeInputs: (inputs: {
    candidateName?: string;
    location?: string;
    resumeText?: string;
    jobDescription?: string;
    githubUrl?: string;
    priorVerificationId?: string;
  }) => void;

  setIntakeResult: (result: {
    sanitizedResume: string;
    redactedTokens: RedactedToken[];
    skillGapAnalysis: SkillGapAnalysis;
    suggestedPath: "kanban" | "repo";
  }) => void;

  setProjectChallenge: (challenge: ProjectChallenge) => void;
  setTasks: (tasks: TaskItem[], evidenceSummary?: string) => void;
  updateTaskStatus: (taskId: string, status: "open" | "assigned" | "verified" | "pre_verified", notes?: string) => void;
  addTask: (task: TaskItem) => void;
  editTask: (taskId: string, updates: Partial<TaskItem>) => void;
  deleteTask: (taskId: string) => void;
  setEvidenceSummary: (summary: string) => void;

  setRepoAnalysis: (analysis: RepoAnalysisData | null) => void;
  setRepoSummary: (summary: string | null) => void;

  setVivaConsent: (consent: boolean) => void;
  setVivaQuestions: (questions: VivaQuestion[]) => void;
  addVivaQuestion: (question: VivaQuestion) => void;
  recordVivaAnswer: (answer: VivaAnswerRecord) => void;
  setVivaData: (
    questions: VivaQuestion[],
    answers: Record<string, VivaAnswerRecord>
  ) => void;

  setSeal: (seal: AuthorshipSeal) => void;
  setDossier: (dossier: VerificationDossier) => void;
  clearSession: () => void;
}

const initialState = {
  isBatchMode: false,
  batchCandidates: [],
  activeCandidateId: null,
  candidateName: "",
  location: "",
  resumeText: "",
  jobDescription:
    "Senior / Junior Full-Stack Backend Engineer. Core expectations: asynchronous web architecture in Python (FastAPI) or Node.js, relational database schema design (PostgreSQL), connection pooling, Redis caching, microservices message queues, and Docker containerization.",
  githubUrl: "",
  priorVerificationId: "",
  priorVerificationData: null,
  sanitizedResume: "",
  redactedTokens: [],
  skillGapAnalysis: null,
  suggestedPath: null,
  projectChallenge: null,
  tasks: [],
  evidenceSummary: null,
  repoAnalysis: null,
  repoSummary: null,
  vivaQuestions: [],
  vivaAnswers: {},
  vivaConsentGiven: false,
  seal: null,
  dossier: null,
};

export const useSessionStore = create<EvaluationSessionState>()(
  persist(
    (set) => ({
      ...initialState,

      setPriorVerification: (priorVerificationId, priorVerificationData) =>
        set({ priorVerificationId, priorVerificationData }),

      setIsBatchMode: (isBatchMode) => set({ isBatchMode }),


      setBatchCandidates: (batchCandidates) => set({ batchCandidates }),

      toggleCandidateShortlist: (candidateId) =>
        set((state) => ({
          batchCandidates: state.batchCandidates.map((c) =>
            c.id === candidateId
              ? { ...c, suggested_shortlist: !c.suggested_shortlist }
              : c
          ),
        })),

      selectActiveCandidate: (candidateId) =>
        set((state) => {
          const cand = state.batchCandidates.find((c) => c.id === candidateId);
          if (!cand) return state;

          return {
            ...state,
            activeCandidateId: candidateId,
            candidateName: cand.name,
            location: cand.location || "Bengaluru",
            resumeText: cand.raw_resume,
            sanitizedResume: cand.sanitized_resume,
            githubUrl: cand.github_url || "",
            suggestedPath: cand.suggested_path,
            skillGapAnalysis: {
              match_percentage: cand.match_percentage,
              acquired_skills: cand.acquired_skills,
              critical_gaps: cand.critical_gaps,
              high_gaps: cand.high_gaps,
            },
            // Reset downstream state for new candidate evaluation
            tasks: [],
            evidenceSummary: null,
            repoAnalysis: null,
            repoSummary: null,
            vivaQuestions: [],
            vivaAnswers: {},
            seal: null,
            dossier: null,
          };
        }),

      setIntakeInputs: (inputs) =>
        set((state) => ({
          ...state,
          ...inputs,
        })),

      setIntakeResult: (result) =>
        set((state) => ({
          ...state,
          sanitizedResume: result.sanitizedResume,
          redactedTokens: result.redactedTokens,
          skillGapAnalysis: result.skillGapAnalysis,
          suggestedPath: result.suggestedPath,
        })),

      setProjectChallenge: (challenge) =>
        set((state) => ({
          ...state,
          projectChallenge: challenge,
        })),

      setTasks: (tasks, evidenceSummary) =>
        set((state) => ({
          ...state,
          tasks,
          evidenceSummary: evidenceSummary ?? state.evidenceSummary,
        })),

      updateTaskStatus: (taskId, status, notes) =>
        set((state) => ({
          ...state,
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? { ...t, status, notes: notes !== undefined ? notes : t.notes }
              : t
          ),
        })),

      addTask: (task) =>
        set((state) => ({
          ...state,
          tasks: [...state.tasks, task],
        })),

      editTask: (taskId, updates) =>
        set((state) => ({
          ...state,
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, ...updates } : t
          ),
        })),

      deleteTask: (taskId) =>
        set((state) => ({
          ...state,
          tasks: state.tasks.filter((t) => t.id !== taskId),
        })),

      setEvidenceSummary: (summary) =>
        set((state) => ({
          ...state,
          evidenceSummary: summary,
        })),

      setRepoAnalysis: (analysis) =>
        set((state) => ({
          ...state,
          repoAnalysis: analysis,
          repoSummary: analysis ? analysis.evidence_summary : state.repoSummary,
          evidenceSummary: analysis ? analysis.evidence_summary : state.evidenceSummary,
        })),

      setRepoSummary: (summary) =>
        set((state) => ({
          ...state,
          repoSummary: summary,
        })),

      setVivaConsent: (consent) =>
        set((state) => ({
          ...state,
          vivaConsentGiven: consent,
        })),

      setVivaQuestions: (questions) =>
        set((state) => ({
          ...state,
          vivaQuestions: questions,
        })),

      addVivaQuestion: (question) =>
        set((state) => ({
          ...state,
          vivaQuestions: [...state.vivaQuestions, question],
        })),

      recordVivaAnswer: (answer) =>
        set((state) => ({
          ...state,
          vivaAnswers: {
            ...state.vivaAnswers,
            [answer.question_id]: answer,
          },
        })),

      setVivaData: (questions, answers) =>
        set((state) => ({
          ...state,
          vivaQuestions: questions,
          vivaAnswers: answers,
        })),

      setSeal: (seal) =>
        set((state) => ({
          ...state,
          seal,
        })),

      setDossier: (dossier) =>
        set((state) => ({
          ...state,
          dossier,
        })),

      clearSession: () => set(initialState),
    }),
    {
      name: "talentforge-evaluation-session",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
