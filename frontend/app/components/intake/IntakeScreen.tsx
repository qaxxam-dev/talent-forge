import * as React from "react";
import { useNavigate } from "react-router";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCheck,
  IconCircleCheck,
  IconExternalLink,
  IconFileText,
  IconFilter,
  IconGitBranch,
  IconLayoutKanban,
  IconRefresh,
  IconSearch,
  IconShieldCheck,
  IconSparkles,
  IconStar,
  IconStarFilled,
  IconUpload,
  IconUsers,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/shared/SectionCard";
import { api, ApiClientError } from "@/lib/api";
import {
  sanitizeText,
  validateJobText,
  validateResumeText,
  type RedactedToken,
} from "@/lib/pii";
import { DEMO_PRESET_BACKEND, DEMO_PRIOR_VERIFICATION } from "@/lib/presets";
import {
  useSessionStore,
  type BatchCandidate,
  type SkillGap,
} from "@/stores/sessionStore";

const TOKEN_PATTERN = /(\[REDACTED_[A-Z_]+\])/g;
const ACCEPTED_FILE = /\.(pdf|docx|doc|txt|md)$/i;

function HighlightedText({ text }: { text: string }) {
  if (!text) {
    return <span className="text-muted-foreground">Nothing to preview yet.</span>;
  }
  return (
    <>
      {text.split(TOKEN_PATTERN).map((part, index) =>
        TOKEN_PATTERN.test(part) ? (
          <span
            key={index}
            className="rounded bg-primary/15 px-1.5 py-0.5 font-mono text-xs font-semibold text-primary"
          >
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}

function TokenRegistry({ tokens }: { tokens: RedactedToken[] }) {
  if (tokens.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
        No personal identifiers detected in candidate text yet.
      </div>
    );
  }
  return (
    <ul className="divide-y divide-border/40 rounded-lg border border-border/60 bg-muted/20">
      {tokens.map((item, idx) => (
        <li
          key={`${item.type}-${item.raw}-${idx}`}
          className="flex items-center justify-between gap-3 px-3.5 py-2 text-xs"
        >
          <div className="flex items-center gap-2 truncate">
            <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider">
              {item.type}
            </Badge>
            <span className="truncate text-muted-foreground line-through">{item.raw}</span>
          </div>
          <span className="shrink-0 font-mono text-primary font-medium">{item.token}</span>
        </li>
      ))}
    </ul>
  );
}

export function IntakeScreen() {
  const navigate = useNavigate();

  // Persistent store state & actions
  const {
    isBatchMode,
    batchCandidates,
    activeCandidateId,
    candidateName,
    location,
    resumeText,
    jobDescription,
    githubUrl,
    skillGapAnalysis,
    suggestedPath,
    seal,
    dossier,
    priorVerificationId,
    priorVerificationData,
    setIsBatchMode,
    setBatchCandidates,
    toggleCandidateShortlist,
    selectActiveCandidate,
    setPriorVerification,
    setIntakeInputs,
    setIntakeResult,
  } = useSessionStore();

  // Local component form state for single intake
  const [name, setName] = React.useState(candidateName);
  const [loc, setLoc] = React.useState(location);
  const [resume, setResume] = React.useState(resumeText);
  const [job, setJob] = React.useState(jobDescription);
  const [github, setGithub] = React.useState(githubUrl);
  const [priorId, setPriorId] = React.useState(priorVerificationId);
  const [isLookingUpPrior, setIsLookingUpPrior] = React.useState(false);

  const [view, setView] = React.useState<"sanitized" | "raw">("sanitized");
  const [inputError, setInputError] = React.useState<string | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [isPending, setIsPending] = React.useState(false);
  const [isBatchPending, setIsBatchPending] = React.useState(false);
  const [isParsingFile, setIsParsingFile] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Batch filter controls
  const [filterMode, setFilterMode] = React.useState<"all" | "shortlist" | "repo" | "kanban">("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Rate-limiting cooldown timer state
  const [cooldownSeconds, setCooldownSeconds] = React.useState<number | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const handleApplyPriorVerification = async (idToLookup?: string) => {
    const targetId = (idToLookup || priorId).trim();
    if (!targetId) return;
    setIsLookingUpPrior(true);
    try {
      const res = await api.verifyLookup(targetId);
      setPriorVerification(targetId, res);
      setPriorId(targetId);
      toast.success(`Loaded verified record for ${res.candidate_name}`, {
        description: `${res.verified_skills.length} skills & ${res.verified_tasks.length} deliverables carried over.`,
      });
    } catch (err: any) {
      toast.error(err.message || "Verification record not found");
    } finally {
      setIsLookingUpPrior(false);
    }
  };


  // Load campus drive batch preset if empty
  React.useEffect(() => {
    async function initBatch() {
      if (batchCandidates.length === 0) {
        setIsBatchPending(true);
        try {
          const res = await api.batchIntake({
            job_description: job || "Backend Engineer",
            use_campus_drive_preset: true,
          });
          setBatchCandidates(res.candidates);
        } catch (err) {
          console.error("Failed to load preset batch", err);
        } finally {
          setIsBatchPending(false);
        }
      }
    }
    void initBatch();
  }, [batchCandidates.length, job, setBatchCandidates]);

  // Live PII sanitization preview as recruiter types
  const preview = React.useMemo(
    () => sanitizeText(resume, { name, location: loc }),
    [resume, name, loc]
  );

  // Synchronize local form inputs to persistent session store on change
  React.useEffect(() => {
    setIntakeInputs({
      candidateName: name,
      location: loc,
      resumeText: resume,
      jobDescription: job,
      githubUrl: github,
      priorVerificationId: priorId,
    });
  }, [name, loc, resume, job, github, priorId, setIntakeInputs]);

  // Handle cooldown countdown
  React.useEffect(() => {
    if (cooldownSeconds === null || cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev && prev > 1 ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // File drop / upload parser
  async function loadFile(file: File) {
    if (!ACCEPTED_FILE.test(file.name)) {
      setFileError("Upload supports PDF, Word (.docx), Markdown (.md), and Plain Text (.txt) files.");
      toast.error("Unsupported file format", {
        description: "Please drop a .pdf, .docx, .md, or .txt file, or paste text directly.",
      });
      return;
    }
    setFileError(null);
    setIsParsingFile(true);
    try {
      if (/\.(pdf|docx|doc)$/i.test(file.name)) {
        toast.info(`Parsing ${file.name}...`, {
          description: "Extracting resume text, candidate details, and links.",
        });
        const parsed = await api.parseResumeFile(file);
        setResume(parsed.raw_text);
        if (parsed.detected_name && !name) setName(parsed.detected_name);
        if (parsed.detected_github && !github) setGithub(parsed.detected_github);
        toast.success(`Imported ${file.name}`, {
          description: `Extracted ${parsed.word_count} words.${
            parsed.detected_name ? ` Detected: ${parsed.detected_name}` : ""
          }`,
        });
      } else {
        const text = await file.text();
        setResume(text);
        toast.success(`Imported ${file.name}`);
      }
    } catch (err: any) {
      const msg = err.message || "Failed to read file.";
      setFileError(msg);
      toast.error("File parsing failed", { description: msg });
    } finally {
      setIsParsingFile(false);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void loadFile(file);
  }

  // 1-Click Reload Campus Drive preset
  async function reloadCampusDrivePreset() {
    setIsBatchPending(true);
    try {
      const res = await api.batchIntake({
        job_description: job,
        use_campus_drive_preset: true,
      });
      setBatchCandidates(res.candidates);
      toast.success("Campus Drive Batch Loaded", {
        description: `Imported ${res.total_processed} candidates. Top ${res.shortlist_count} shortlisted.`,
      });
    } catch (err: unknown) {
      toast.error("Failed to load campus drive batch", {
        description: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setIsBatchPending(false);
    }
  }

  // Submit single candidate intake
  async function handleAnalyze() {
    const error = validateResumeText(resume) ?? validateJobText(job);
    setInputError(error);
    if (error) {
      toast.warning("Validation check required", { description: error });
      return;
    }

    setIsPending(true);
    setServerError(null);

    try {
      const data = await api.intake({
        resume_text: resume,
        job_description: job,
        candidate_name: name || undefined,
        location: loc || undefined,
        github_url: github || undefined,
      });

      setIntakeResult({
        sanitizedResume: data.sanitized_resume,
        redactedTokens: data.redacted_fields,
        skillGapAnalysis: data.skill_gap_analysis,
        suggestedPath: data.suggested_path,
      });

      toast.success("Intake analysis complete", {
        description: `Match score: ${data.skill_gap_analysis.match_percentage}%. ${data.skill_gap_analysis.critical_gaps.length} critical gaps identified.`,
      });
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.status === 429) {
        setCooldownSeconds(err.retryAfterSeconds ?? 60);
        setServerError(err.message);
        toast.error("Rate limit reached", { description: err.message });
      } else {
        const msg = err instanceof Error ? err.message : "Failed to analyze intake";
        setServerError(msg);
        toast.error("Analysis failed", { description: msg });
      }
    } finally {
      setIsPending(false);
    }
  }

  // Filter batch candidates
  const filteredCandidates = React.useMemo(() => {
    return batchCandidates.filter((cand) => {
      // Filter by mode
      if (filterMode === "shortlist" && !cand.suggested_shortlist) return false;
      if (filterMode === "repo" && cand.suggested_path !== "repo") return false;
      if (filterMode === "kanban" && cand.suggested_path !== "kanban") return false;

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = cand.name.toLowerCase().includes(q);
        const matchId = cand.id.toLowerCase().includes(q);
        const matchSkill = cand.acquired_skills.some((s) => s.toLowerCase().includes(q));
        const matchGap = cand.critical_gaps.some((g) => g.name.toLowerCase().includes(q));
        if (!matchName && !matchId && !matchSkill && !matchGap) return false;
      }
      return true;
    });
  }, [batchCandidates, filterMode, searchQuery]);

  // Candidate selection & routing to Screen 2
  function handleSelectCandidate(cand: BatchCandidate) {
    selectActiveCandidate(cand.id);

    if (cand.suggested_path === "repo") {
      toast.success(`Promoted ${cand.name}`, {
        description: "Verified repository detected. Routing to Screen 2: Repo Evidence Audit.",
      });
      navigate("/repo-analysis");
    } else {
      toast.success(`Promoted ${cand.name}`, {
        description: "No public repo verified. Routing to Screen 2: 3-Sprint Engineering Spec.",
      });
      navigate("/kanban");
    }
  }

  const totalCandidates = batchCandidates.length;
  const shortlistedCount = batchCandidates.filter((c) => c.suggested_shortlist).length;
  const repoReadyCount = batchCandidates.filter((c) => c.suggested_path === "repo").length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Campus Drive Intake
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Review shortlisted candidates and launch Code-Defend sessions.
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/40 p-1">
          <Button
            size="sm"
            variant={isBatchMode ? "default" : "ghost"}
            className={`h-8 text-xs gap-1.5 transition-all ${
              isBatchMode
                ? "bg-primary text-primary-foreground font-semibold shadow-xs hover:bg-primary/95"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium"
            }`}
            onClick={() => setIsBatchMode(true)}
          >
            <IconUsers className="size-3.5" />
            Campus Drive Batch ({totalCandidates})
          </Button>
          <Button
            size="sm"
            variant={!isBatchMode ? "default" : "ghost"}
            className={`h-8 text-xs gap-1.5 transition-all ${
              !isBatchMode
                ? "bg-primary text-primary-foreground font-semibold shadow-xs hover:bg-primary/95"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium"
            }`}
            onClick={() => setIsBatchMode(false)}
          >
            <IconFileText className="size-3.5" />
            Single Candidate Deep Intake
          </Button>
        </div>
      </div>

      {isBatchMode ? (
        /* BATCH FUNNEL VIEW */
        <div className="space-y-6">
          {/* Executive Recruiter Metric Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Total Candidates
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground font-mono">{totalCandidates}</span>
                <span className="text-[11px] text-muted-foreground">candidates</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                <IconShieldCheck className="size-3 text-emerald-500" /> 100% PII sanitized
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Shortlisted
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground font-mono">{shortlistedCount}</span>
                <span className="text-[11px] text-muted-foreground">for Code-Defend</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                ≥ 75% Day-Zero match
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Repo Evidence
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground font-mono">{repoReadyCount}</span>
                <span className="text-[11px] text-muted-foreground">codebases</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                <IconGitBranch className="size-3 text-primary" /> Pre-flight analyzed
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Spec Path
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground font-mono">{totalCandidates - repoReadyCount}</span>
                <span className="text-[11px] text-muted-foreground">candidates</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                <IconLayoutKanban className="size-3 text-amber-500" /> 3-Sprint plan needed
              </p>
            </div>
          </div>

          {/* Action Bar & Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border/80 bg-card/60 p-3.5 backdrop-blur-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
                <IconFilter className="size-3.5" /> Filter:
              </span>
              <Button
                size="sm"
                variant={filterMode === "all" ? "secondary" : "ghost"}
                className="h-7 text-xs px-2.5 font-normal"
                onClick={() => setFilterMode("all")}
              >
                All ({totalCandidates})
              </Button>
              <Button
                size="sm"
                variant={filterMode === "shortlist" ? "secondary" : "ghost"}
                className="h-7 text-xs px-2.5 font-normal"
                onClick={() => setFilterMode("shortlist")}
              >
                Shortlisted ({shortlistedCount})
              </Button>
              <Button
                size="sm"
                variant={filterMode === "repo" ? "secondary" : "ghost"}
                className="h-7 text-xs px-2.5 font-normal"
                onClick={() => setFilterMode("repo")}
              >
                Repo Evidence ({repoReadyCount})
              </Button>
              <Button
                size="sm"
                variant={filterMode === "kanban" ? "secondary" : "ghost"}
                className="h-7 text-xs px-2.5 font-normal"
                onClick={() => setFilterMode("kanban")}
              >
                Spec Path ({totalCandidates - repoReadyCount})
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-56">
                <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search candidate, skill, gap..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs bg-background/80"
                />
              </div>

              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5 shrink-0"
                onClick={reloadCampusDrivePreset}
                disabled={isBatchPending}
              >
                <IconRefresh className={`size-3.5 ${isBatchPending ? "animate-spin" : ""}`} />
                Reset Filters
              </Button>
            </div>
          </div>

          {/* Candidate Table */}
          <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border/80 bg-muted/40 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">★</th>
                    <th className="py-3 px-4">Candidate</th>
                    <th className="py-3 px-4 w-36">Match Score</th>
                    <th className="py-3 px-4">Critical Skill Gaps</th>
                    <th className="py-3 px-4 w-36">Evidence Path</th>
                    <th className="py-3 px-4 text-right w-36">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredCandidates.map((cand, idx) => {
                    const isSelected = activeCandidateId === cand.id;
                    let candidateStatus: "Completed" | "In Session" | "Ready" = "Ready";
                    if (isSelected) {
                      candidateStatus = seal || dossier ? "Completed" : "In Session";
                    }

                    return (
                      <tr
                        key={cand.id}
                        className={`transition-colors hover:bg-muted/25 ${
                          isSelected ? "bg-primary/[0.04] border-l-2 border-l-primary" : ""
                        }`}
                      >
                        {/* Star Shortlist Toggle */}
                        <td className="py-3.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleCandidateShortlist(cand.id)}
                            className="text-muted-foreground/40 hover:text-amber-500 transition-colors cursor-pointer"
                            title="Toggle Shortlist"
                          >
                            {cand.suggested_shortlist ? (
                              <IconStarFilled className="size-4 text-amber-500 fill-amber-500 dark:text-amber-400 dark:fill-amber-400 drop-shadow-xs" />
                            ) : (
                              <IconStar className="size-4 opacity-40 hover:opacity-100" />
                            )}
                          </button>
                        </td>

                        {/* Candidate info + Status Badge */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-muted-foreground">
                                {String(idx + 1).padStart(2, "0")}
                              </span>
                              <span className="font-medium text-foreground text-sm">
                                {cand.name}
                              </span>
                            </div>
                            <div className="flex items-center pl-6">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium leading-none ${
                                  candidateStatus === "Completed"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                    : candidateStatus === "In Session"
                                    ? "bg-primary/10 text-primary border border-primary/20"
                                    : "bg-muted/60 text-muted-foreground border border-border/60"
                                }`}
                              >
                                <span
                                  className={`size-1.5 rounded-full ${
                                    candidateStatus === "Completed"
                                      ? "bg-emerald-500"
                                      : candidateStatus === "In Session"
                                      ? "bg-primary animate-pulse"
                                      : "bg-muted-foreground/50"
                                  }`}
                                />
                                {candidateStatus}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Match Score */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`size-2 rounded-full shrink-0 ${
                                cand.match_percentage >= 75
                                  ? "bg-emerald-500/80 ring-2 ring-emerald-500/20"
                                  : "bg-muted-foreground/30"
                              }`}
                              title={
                                cand.match_percentage >= 75
                                  ? "Shortlist Ready (≥75%)"
                                  : "Skill Gaps Identified (<75%)"
                              }
                            />
                            <span className="font-mono text-xs font-medium text-foreground">
                              {cand.match_percentage}%
                            </span>
                          </div>
                        </td>

                        {/* Gaps */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1.5 max-w-md">
                            {cand.critical_gaps.map((gap, gIdx) => (
                              <Badge
                                key={gIdx}
                                variant="outline"
                                className="text-[11px] font-normal text-muted-foreground border-border/70 bg-muted/20"
                                title={gap.explanation}
                              >
                                {gap.name}
                              </Badge>
                            ))}
                          </div>
                        </td>

                        {/* Evidence Path */}
                        <td className="py-3.5 px-4">
                          <Badge
                            variant="outline"
                            className="text-[11px] font-medium text-muted-foreground border-border/70 bg-muted/20 gap-1.5 py-0.5 px-2"
                          >
                            {cand.suggested_path === "repo" ? (
                              <>
                                <IconGitBranch className="size-3 text-muted-foreground/80" />
                                Repo
                              </>
                            ) : (
                              <>
                                <IconLayoutKanban className="size-3 text-muted-foreground/80" />
                                Spec
                              </>
                            )}
                          </Badge>
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs font-medium gap-1 text-foreground border-border/80 hover:bg-muted"
                            onClick={() => handleSelectCandidate(cand)}
                          >
                            Launch Viva
                            <IconArrowRight className="size-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* SINGLE CANDIDATE DEEP INTAKE VIEW */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left Column: Form & Inputs */}
          <div className="space-y-4">
            <SectionCard
              title="Candidate Ingestion"
              action={<Badge variant="outline">DPDP Step 1</Badge>}
              description="Enter candidate profile or raw resume text. PII will be extracted and sanitized before downstream LLM processing."
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="cand-name" className="text-xs">
                      Candidate Name (for redaction)
                    </Label>
                    <Input
                      id="cand-name"
                      placeholder="e.g. Aarav Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cand-loc" className="text-xs">
                      Location / Region
                    </Label>
                    <Input
                      id="cand-loc"
                      placeholder="e.g. New Delhi, India"
                      value={loc}
                      onChange={(e) => setLoc(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="cand-gh" className="text-xs">
                    Public GitHub URL (Optional)
                  </Label>
                  <Input
                    id="cand-gh"
                    placeholder="https://github.com/username/project"
                    value={github}
                    onChange={(e) => setGithub(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5 rounded-lg border border-border/60 bg-muted/20 p-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="prior-verify-id" className="text-xs font-medium flex items-center gap-1.5 text-foreground">
                      <IconShieldCheck className="size-4 text-primary" />
                      Prior Verification ID / Link (Optional)
                    </Label>
                    <button
                      type="button"
                      onClick={() => handleApplyPriorVerification(DEMO_PRIOR_VERIFICATION.verificationId)}
                      className="text-[11px] text-primary hover:underline font-mono"
                    >
                      Load Demo ({DEMO_PRIOR_VERIFICATION.verificationId})
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      id="prior-verify-id"
                      placeholder="e.g. TF-VERIFY-20261012-8821 or past verification seal"
                      value={priorId}
                      onChange={(e) => setPriorId(e.target.value)}
                      className="text-xs font-mono bg-background"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!priorId || isLookingUpPrior}
                      onClick={() => handleApplyPriorVerification()}
                      className="text-xs shrink-0 h-9"
                    >
                      {isLookingUpPrior ? <IconRefresh className="size-3 animate-spin" /> : "Verify"}
                    </Button>
                  </div>

                  {priorVerificationData && (
                    <div className="rounded-lg border border-border bg-card p-3 text-xs text-foreground space-y-1.5 mt-2 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <IconCheck className="size-3.5 stroke-[2.5]" />
                          Pre-Verified Competencies: {priorVerificationData.target_role}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setPriorId("");
                            setPriorVerification("", null);
                          }}
                          className="text-[11px] text-muted-foreground hover:text-foreground underline transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        <span className="font-medium text-foreground">Verified:</span> {priorVerificationData.verified_skills.slice(0, 4).join(", ")} · {priorVerificationData.verified_tasks.length} artifacts verified under {priorVerificationData.verification_id}. Overlapping tickets will carry over automatically.
                      </p>
                    </div>
                  )}
                </div>


                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="resume-text" className="text-xs font-medium">
                      Resume Text (Raw or Extracted)
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {resume.split(/\s+/).filter(Boolean).length} words
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isParsingFile}
                        onClick={() => fileInputRef.current?.click()}
                        className="h-6 text-[11px] px-2 gap-1"
                      >
                        {isParsingFile ? (
                          <IconRefresh className="size-3 animate-spin" />
                        ) : (
                          <IconUpload className="size-3" />
                        )}
                        Upload File (.pdf, .docx, .txt)
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.doc,.txt,.md"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void loadFile(f);
                          e.target.value = "";
                        }}
                      />
                    </div>
                  </div>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    className={`relative rounded-lg border transition-all ${
                      dragging
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                        : "border-border/80 bg-background"
                    }`}
                  >
                    {isParsingFile && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-xs rounded-lg gap-2 text-xs font-medium text-foreground">
                        <IconRefresh className="size-5 animate-spin text-primary" />
                        <span>Parsing document text & structure...</span>
                      </div>
                    )}
                    <Textarea
                      id="resume-text"
                      rows={9}
                      placeholder="Paste raw candidate resume text here, or drag-and-drop a .pdf, .docx, or .txt file..."
                      value={resume}
                      onChange={(e) => setResume(e.target.value)}
                      className="text-xs border-0 focus-visible:ring-0 resize-none font-sans"
                    />
                  </div>
                  {fileError && <p className="text-[11px] text-destructive">{fileError}</p>}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="job-desc" className="text-xs">
                    Target Job Requirements
                  </Label>
                  <Textarea
                    id="job-desc"
                    rows={4}
                    placeholder="Paste job description / required competencies..."
                    value={job}
                    onChange={(e) => setJob(e.target.value)}
                    className="text-xs font-sans"
                  />
                </div>

                {inputError && (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-600 dark:text-amber-400">
                    <IconAlertTriangle className="size-4 shrink-0" />
                    <span>{inputError}</span>
                  </div>
                )}

                {serverError && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-600 dark:text-red-400">
                    <IconAlertTriangle className="size-4 shrink-0" />
                    <span>{serverError}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5"
                    onClick={() => {
                      setName(DEMO_PRESET_BACKEND.candidateName);
                      setLoc(DEMO_PRESET_BACKEND.location);
                      setResume(DEMO_PRESET_BACKEND.resumeText);
                      setJob(DEMO_PRESET_BACKEND.jobDescription);
                      setGithub(DEMO_PRESET_BACKEND.githubUrl);
                      handleApplyPriorVerification(DEMO_PRIOR_VERIFICATION.verificationId);
                    }}
                  >
                    <IconSparkles className="size-3.5" />
                    Load Demo Profile
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    className="text-xs font-semibold gap-1.5"
                    disabled={isPending || (cooldownSeconds !== null && cooldownSeconds > 0)}
                    onClick={handleAnalyze}
                  >
                    {isPending ? (
                      <>
                        <IconRefresh className="size-3.5 animate-spin" />
                        Analyzing Gaps...
                      </>
                    ) : cooldownSeconds ? (
                      `Cooldown (${cooldownSeconds}s)`
                    ) : (
                      <>
                        Analyze Skill Gaps
                        <IconArrowRight className="size-3.5" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Right Column: PII Sanitization Preview & Gap Analysis */}
          <div className="space-y-4">
            <SectionCard
              title="DPDP Sanitized Profile Preview"
              action={<Badge variant="outline">Section 8 Redaction</Badge>}
              description="Personal identifiable data is replaced with canonical cryptographic tokens before any cloud processing."
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant={view === "sanitized" ? "default" : "ghost"}
                      className="h-7 text-xs px-2.5"
                      onClick={() => setView("sanitized")}
                    >
                      Sanitized View
                    </Button>
                    <Button
                      size="sm"
                      variant={view === "raw" ? "default" : "ghost"}
                      className="h-7 text-xs px-2.5"
                      onClick={() => setView("raw")}
                    >
                      Raw Input
                    </Button>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto rounded-lg border border-border/60 bg-muted/20 p-3 text-xs leading-relaxed font-mono">
                  {view === "sanitized" ? (
                    <HighlightedText text={preview.sanitizedText} />
                  ) : (
                    <span>{resume || "No resume text entered yet."}</span>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <IconShieldCheck className="size-4 text-muted-foreground" />
                    Redacted Identifier Registry ({preview.redactedTokens.length})
                  </h4>
                  <TokenRegistry tokens={preview.redactedTokens} />
                </div>

                {skillGapAnalysis && (
                  <div className="mt-5 pt-4 border-t border-border space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-semibold text-foreground tracking-tight">
                          Day-Zero Match Assessment
                        </span>
                        <Badge variant="secondary" className="font-mono text-xs font-semibold">
                          {skillGapAnalysis.match_percentage}% Match
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        className="h-8 text-xs gap-1.5 font-medium shrink-0 self-start sm:self-auto"
                        onClick={() => {
                          if (suggestedPath === "repo") {
                            navigate("/repo-analysis");
                          } else {
                            navigate("/kanban");
                          }
                        }}
                      >
                        Proceed to {suggestedPath === "repo" ? "Repo Audit" : "Kanban"}
                        <IconArrowRight className="size-3.5" />
                      </Button>
                    </div>

                    {skillGapAnalysis.authenticity_notes && (
                      <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1 text-xs">
                        <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
                          <IconShieldCheck className="size-3.5 text-muted-foreground" />
                          Forensic Authenticity Assessment
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {skillGapAnalysis.authenticity_notes}
                        </p>
                      </div>
                    )}

                    {skillGapAnalysis.acquired_skills.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                          Demonstrated Competencies ({skillGapAnalysis.acquired_skills.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {skillGapAnalysis.acquired_skills.map((s, i) => (
                            <Badge
                              key={i}
                              variant="secondary"
                              className="text-xs font-normal"
                            >
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {skillGapAnalysis.unsubstantiated_claims &&
                      skillGapAnalysis.unsubstantiated_claims.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                            Unsubstantiated Claims ({skillGapAnalysis.unsubstantiated_claims.length})
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {skillGapAnalysis.unsubstantiated_claims.map((s, i) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className="border-border text-xs font-normal"
                              >
                                {s}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Claimed without project evidence. Routed into Kanban & Viva defense.
                          </p>
                        </div>
                      )}

                    {skillGapAnalysis.critical_gaps && skillGapAnalysis.critical_gaps.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                          Critical Gaps ({skillGapAnalysis.critical_gaps.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {skillGapAnalysis.critical_gaps.map((gap, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="border-border text-xs font-normal"
                            >
                              {gap.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  );
}
