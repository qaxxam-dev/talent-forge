import * as React from "react";
import { Link, useNavigate } from "react-router";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconCode,
  IconCopy,
  IconExternalLink,
  IconFileCode,
  IconGitBranch,
  IconLayoutKanban,
  IconRefresh,
  IconShieldCheck,
  IconStar,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/sessionStore";

export function meta() {
  return [
    { title: "Repository Evidence — TalentForge" },
    {
      name: "description",
      content:
        "Codebase evidence verification, static forensics, and claimed artifact binding for oral viva defense.",
    },
  ];
}

export default function RepoAnalysisRoute() {
  const navigate = useNavigate();

  const {
    candidateName,
    githubUrl,
    jobDescription,
    skillGapAnalysis,
    repoAnalysis,
    evidenceSummary,
    setRepoAnalysis,
    setEvidenceSummary,
  } = useSessionStore();

  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedArtifacts, setSelectedArtifacts] = React.useState<string[]>([]);

  const activeUrl = githubUrl || "https://github.com/aarav-sharma/fastapi-distributed-queue";

  const loadAnalysis = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.analyzeRepo({
        github_url: activeUrl,
        job_description: jobDescription,
        candidate_name: candidateName,
      });
      setRepoAnalysis(res);
      setSelectedArtifacts(res.key_files ? res.key_files.map((f: any) => f.path) : []);
    } catch (err) {
      toast.error("Failed to analyze repository", {
        description: err instanceof Error ? err.message : "Error fetching repository",
      });
    } finally {
      setIsLoading(false);
    }
  }, [activeUrl, candidateName, jobDescription, setRepoAnalysis]);

  // Auto-analyze on load if not already analyzed
  React.useEffect(() => {
    if (!repoAnalysis || repoAnalysis.github_url !== activeUrl) {
      void loadAnalysis();
    } else if (selectedArtifacts.length === 0 && repoAnalysis.key_files) {
      setSelectedArtifacts(repoAnalysis.key_files.map((f) => f.path));
    }
  }, [activeUrl, repoAnalysis, loadAnalysis, selectedArtifacts.length]);

  const toggleArtifact = (path: string) => {
    setSelectedArtifacts((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const handleProceedToViva = () => {
    const summary =
      repoAnalysis?.evidence_summary ||
      `Candidate submitted ${selectedArtifacts.length} verified repository deliverables in ${repoAnalysis?.repo_name || "codebase"}.`;
    setEvidenceSummary(summary);
    toast.success("Evidence bound to Oral Viva", {
      description: `${selectedArtifacts.length} codebase artifacts selected for architectural questioning.`,
    });
    navigate("/viva");
  };

  const [activeFileIdx, setActiveFileIdx] = React.useState(0);
  const [copied, setCopied] = React.useState(false);

  const activeFile = repoAnalysis?.key_files[activeFileIdx] || repoAnalysis?.key_files[0];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="size-8">
              <IconArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Repository Evidence
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 font-mono">
              {candidateName || "Aarav Sharma"} · {repoAnalysis?.repo_name || "fastapi-distributed-queue"}
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 h-8 border-border/70 text-muted-foreground hover:text-foreground"
            onClick={() => {
              toast.info("Switched to Spec Path", {
                description: "Generating 3-Sprint Engineering Spec Kanban tickets.",
              });
              navigate("/kanban");
            }}
          >
            <IconLayoutKanban className="size-3.5" />
            Switch to Spec Path
          </Button>

          <Button
            size="sm"
            className="text-xs font-semibold gap-1.5 h-8 shadow-xs"
            onClick={handleProceedToViva}
            disabled={isLoading || !repoAnalysis || selectedArtifacts.length === 0}
          >
            Continue to Viva
            <span className="font-mono text-[11px] opacity-75">
              ({selectedArtifacts.length})
            </span>
            <IconArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-card p-16 text-center">
          <IconRefresh className="mx-auto size-8 animate-spin text-muted-foreground/60 mb-3" />
          <p className="text-sm font-semibold text-foreground">Analyzing Repository Forensics...</p>
          <p className="text-xs text-muted-foreground mt-1">
            Inspecting public file tree, commit artifacts, and architectural relevance against job skill gaps.
          </p>
        </div>
      ) : repoAnalysis ? (
        <div className="space-y-6">
          {/* Executive Metrics (Clean Monochrome) */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border/70 bg-card p-3.5 shadow-xs">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Signal
              </span>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={`size-2 rounded-full shrink-0 ${
                    repoAnalysis.has_sufficient_signal
                      ? "bg-primary"
                      : "bg-muted-foreground/30"
                  }`}
                  title={repoAnalysis.has_sufficient_signal ? "High Signal Verified" : "Weak Signal"}
                />
                <span className="text-base font-semibold text-foreground font-mono">
                  {repoAnalysis.has_sufficient_signal ? "High Signal" : "Weak Signal"} · {repoAnalysis.confidence_score}%
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Evidence confidence
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-3.5 shadow-xs">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Repository
              </span>
              <div className="mt-1 truncate">
                <span className="text-sm font-semibold text-foreground font-mono truncate block">
                  {repoAnalysis.repo_name}
                </span>
              </div>
              <a
                href={repoAnalysis.github_url}
                target="_blank"
                rel="noreferrer"
                className="mt-0.5 text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 hover:underline truncate"
              >
                <span>{repoAnalysis.owner}/{repoAnalysis.repo_name}</span>
                <IconExternalLink className="size-3 shrink-0 opacity-60" />
              </a>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-3.5 shadow-xs">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Stack
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-base font-semibold text-foreground font-mono">
                  {repoAnalysis.primary_language}
                </span>
                <span className="text-xs text-muted-foreground/80 font-mono">
                  ★ {repoAnalysis.stars}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Matches target role stack
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-3.5 shadow-xs">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Selected for Viva
              </span>
              <div className="mt-1 flex items-baseline gap-1.5 font-mono">
                <span className="text-base font-semibold text-foreground">
                  {selectedArtifacts.length}
                </span>
                <span className="text-xs text-muted-foreground">
                  / {repoAnalysis.key_files.length} deliverables
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Selected for viva
              </p>
            </div>
          </div>

          {/* Commit Forensics & Authenticity Audit Card */}
          {repoAnalysis.commit_forensics && (
            <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/50 pb-2.5">
                <div className="flex items-center gap-2">
                  <IconGitBranch className="size-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground">
                    Commit Timeline Forensics & Authorship Audit
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {repoAnalysis.commit_forensics.total_commits} commits analyzed
                  </span>
                  <Badge
                    variant={
                      repoAnalysis.commit_forensics.forensic_risk_score === "HIGH"
                        ? "destructive"
                        : "outline"
                    }
                    className="text-[10px] uppercase font-mono"
                  >
                    Risk: {repoAnalysis.commit_forensics.forensic_risk_score}
                  </Badge>
                </div>
              </div>

              <p className="text-xs text-foreground/90 leading-relaxed font-medium">
                {repoAnalysis.commit_forensics.forensic_summary}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="rounded-lg border border-border/60 bg-muted/20 p-2 text-xs">
                  <span className="text-[10px] text-muted-foreground uppercase block font-medium">Fork Status</span>
                  <span
                    className={`text-[11px] font-semibold ${
                      repoAnalysis.commit_forensics.is_fork
                        ? "text-destructive"
                        : "text-foreground"
                    }`}
                  >
                    {repoAnalysis.commit_forensics.is_fork ? "Forked Repository" : "Original Repository"}
                  </span>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-2 text-xs">
                  <span className="text-[10px] text-muted-foreground uppercase block font-medium">Commit Dump</span>
                  <span
                    className={`text-[11px] font-semibold ${
                      repoAnalysis.commit_forensics.single_giant_initial_commit
                        ? "text-destructive"
                        : "text-foreground"
                    }`}
                  >
                    {repoAnalysis.commit_forensics.single_giant_initial_commit
                      ? "1-Commit Dump Alert"
                      : "Iterative History"}
                  </span>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-2 text-xs">
                  <span className="text-[10px] text-muted-foreground uppercase block font-medium">Timestamp Cluster</span>
                  <span
                    className={`text-[11px] font-semibold ${
                      repoAnalysis.commit_forensics.timestamps_clustered_minutes
                        ? "text-destructive"
                        : "text-foreground"
                    }`}
                  >
                    {repoAnalysis.commit_forensics.timestamps_clustered_minutes
                      ? "Suspiciously Clustered"
                      : "Natural Spread"}
                  </span>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-2 text-xs">
                  <span className="text-[10px] text-muted-foreground uppercase block font-medium">Committer Match</span>
                  <span
                    className={`text-[11px] font-semibold ${
                      repoAnalysis.commit_forensics.author_mismatch
                        ? "text-destructive"
                        : "text-foreground"
                    }`}
                  >
                    {repoAnalysis.commit_forensics.author_mismatch
                      ? "Author Mismatch"
                      : "Profile Matches Git"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* AI Evidence Assessment Banner */}
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <div className="flex items-center gap-2">
                <IconShieldCheck className="size-4 text-foreground" />
                <span>Architectural Evidence Assessment</span>
              </div>
              <span className="font-mono text-[11px] font-normal text-muted-foreground">
                Confidence: {repoAnalysis.confidence_score}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {repoAnalysis.reasoning || repoAnalysis.evidence_summary}
            </p>
          </div>

          {/* Master-Detail Codebase Workbench */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Master List (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Deliverables ({repoAnalysis.key_files.length})
                </h3>
                <span className="text-[11px] text-muted-foreground">
                  Select for viva
                </span>
              </div>

              <div className="space-y-2">
                {repoAnalysis.key_files.map((file, idx) => {
                  const isSelected = selectedArtifacts.includes(file.path);
                  const isActive = activeFileIdx === idx;

                  return (
                    <div
                      key={file.path}
                      onClick={() => setActiveFileIdx(idx)}
                      className={`rounded-xl border p-3.5 cursor-pointer transition-all ${
                        isActive
                          ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/30"
                          : "border-border/70 bg-card hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleArtifact(file.path);
                            }}
                            className="size-4 mt-0.5 rounded border-border text-primary focus:ring-primary cursor-pointer shrink-0"
                            title={isSelected ? "Unselect from Viva" : "Select for Viva"}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-foreground truncate">
                                {file.path.split("/").pop()}
                              </span>
                              <Badge variant="outline" className="text-[10px] font-mono py-0 h-4 border-border/60">
                                {file.language}
                              </Badge>
                            </div>
                            <span className="font-mono text-[11px] text-muted-foreground/80 truncate block mt-0.5">
                              {file.path}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="mt-2 text-[11px] text-muted-foreground line-clamp-2 pl-6.5">
                        {file.relevance_explanation}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Detail Preview (7 cols) */}
            <div className="lg:col-span-7">
              {activeFile ? (
                <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden flex flex-col min-h-[520px]">
                  {/* Code Viewer Top Bar */}
                  <div className="flex items-center justify-between border-b border-border/70 bg-muted/30 px-4 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <IconFileCode className="size-4 text-muted-foreground shrink-0" />
                      <span className="font-mono text-xs font-semibold text-foreground truncate">
                        {activeFile.path}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono py-0 h-4 border-border/60">
                        {activeFile.language}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                        onClick={() => {
                          if (activeFile.code_snippet) {
                            navigator.clipboard.writeText(activeFile.code_snippet);
                            setCopied(true);
                            toast.success("Copied snippet to clipboard");
                            setTimeout(() => setCopied(false), 2000);
                          }
                        }}
                      >
                        {copied ? <IconCheck className="size-3.5 text-foreground" /> : <IconCopy className="size-3.5" />}
                        <span className="text-[11px]">{copied ? "Copied" : "Copy"}</span>
                      </Button>

                      <Button
                        variant={selectedArtifacts.includes(activeFile.path) ? "secondary" : "outline"}
                        size="sm"
                        className="h-7 text-xs font-medium"
                        onClick={() => toggleArtifact(activeFile.path)}
                      >
                        {selectedArtifacts.includes(activeFile.path) ? (
                          <span className="flex items-center gap-1 text-[11px]">
                            <IconCheck className="size-3 text-primary" />
                            Included in Viva
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">+ Include in Viva</span>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Signal Takeaway Banner */}
                  <div className="border-b border-border/60 bg-muted/15 px-4 py-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Why this matters: </span>
                    {activeFile.relevance_explanation}
                  </div>

                  {/* Monospace Code Editor View */}
                  <div className="p-4 bg-muted/10 flex-1 overflow-x-auto">
                    {activeFile.code_snippet ? (
                      <pre className="font-mono text-xs leading-relaxed text-foreground/90 selection:bg-primary/20">
                        <code>{activeFile.code_snippet}</code>
                      </pre>
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground py-16">
                        No code snippet extracted for this file.
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/80 bg-card p-12 text-center text-muted-foreground">
          <IconAlertCircle className="mx-auto size-10 opacity-30 mb-3" />
          <p className="text-sm font-medium">No Repository Evidence Available</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-semibold gap-1.5"
              onClick={() => void loadAnalysis()}
            >
              <IconRefresh className="size-3.5" />
              Retry Analysis
            </Button>
            <Button
              size="sm"
              className="text-xs font-semibold gap-1.5"
              onClick={() => navigate("/kanban")}
            >
              Switch to 3-Sprint Engineering Spec
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
