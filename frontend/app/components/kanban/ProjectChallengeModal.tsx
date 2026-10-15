import * as React from "react";
import {
  IconBulb,
  IconCheck,
  IconLoader2,
  IconSparkles,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiClientError, type ChallengeIdea } from "@/lib/api";
import { INDUSTRY_CHALLENGE_PRESETS } from "@/lib/challengePresets";
import { useSessionStore, type TaskItem } from "@/stores/sessionStore";

const DEFAULT_IDEAS: ChallengeIdea[] = INDUSTRY_CHALLENGE_PRESETS.map((preset) => ({
  id: preset.id,
  title: preset.title,
  tagline: preset.tagline,
  problem_statement: preset.problemStatement,
  tech_stack_focus: preset.techStackFocus,
  targeted_skills: ["Architecture & Models", "API Robustness", "Testing & Deployment"],
}));

interface ProjectChallengeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ProjectChallengeModal({
  open,
  onOpenChange,
  onSuccess,
}: ProjectChallengeModalProps) {
  const {
    jobDescription,
    skillGapAnalysis,
    projectChallenge,
    priorVerificationData,
    setProjectChallenge,
    setTasks,
  } = useSessionStore();

  const [ideas, setIdeas] = React.useState<ChallengeIdea[]>(DEFAULT_IDEAS);
  const [selectedIdeaId, setSelectedIdeaId] = React.useState<string>(DEFAULT_IDEAS[0].id);
  const [title, setTitle] = React.useState(
    projectChallenge?.title || DEFAULT_IDEAS[0].title
  );
  const [problemStatement, setProblemStatement] = React.useState(
    projectChallenge?.problem_statement || DEFAULT_IDEAS[0].problem_statement
  );
  const [techStack, setTechStack] = React.useState(
    projectChallenge?.tech_stack_focus || DEFAULT_IDEAS[0].tech_stack_focus
  );
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isFetchingIdeas, setIsFetchingIdeas] = React.useState(false);
  const [hasFetchedAiIdeas, setHasFetchedAiIdeas] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSelectIdea = (idea: ChallengeIdea) => {
    setSelectedIdeaId(idea.id);
    setTitle(idea.title);
    setProblemStatement(idea.problem_statement);
    setTechStack(idea.tech_stack_focus);
  };

  const handleFetchAiIdeas = React.useCallback(async () => {
    setIsFetchingIdeas(true);
    setErrorMsg(null);
    try {
      const result = await api.generateChallengeIdeas({
        role_title: "Senior Technical Candidate",
        job_description: jobDescription || "Senior technical role requirements",
        skill_gap_analysis: skillGapAnalysis || undefined,
      });

      if (result.ideas && result.ideas.length > 0) {
        setIdeas(result.ideas);
        const first = result.ideas[0];
        setSelectedIdeaId(first.id);
        setTitle(first.title);
        setProblemStatement(first.problem_statement);
        setTechStack(first.tech_stack_focus);
        setHasFetchedAiIdeas(true);
        toast.success("AI Generated 4 Challenge Ideas", {
          description: "4 real-world business scenarios tailored to role & skill gaps.",
        });
      }
    } catch (err: any) {
      if (err instanceof ApiClientError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg(err?.message || "Failed to fetch AI challenge ideas.");
      }
      toast.error("Idea Generation Failed", { description: err?.message });
    } finally {
      setIsFetchingIdeas(false);
    }
  }, [jobDescription, skillGapAnalysis]);

  // Request 4 AI ideas when modal opens if not already fetched
  React.useEffect(() => {
    if (open && !hasFetchedAiIdeas) {
      handleFetchAiIdeas();
    }
  }, [open, hasFetchedAiIdeas, handleFetchAiIdeas]);

  const handleGenerate = async () => {
    if (!title.trim() || !problemStatement.trim()) {
      setErrorMsg("Please provide a challenge title and problem statement.");
      return;
    }

    if (!skillGapAnalysis) {
      toast.error("Candidate Intake Missing", {
        description: "Please complete candidate intake first.",
      });
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const result = await api.generateSpec({
        role_title: "Senior Technical Candidate",
        job_description: jobDescription || "Senior technical role requirements",
        skill_gap_analysis: skillGapAnalysis,
        project_challenge: {
          title,
          problem_statement: problemStatement,
          tech_stack_focus: techStack,
        },
        prior_verification: priorVerificationData
          ? {
              verification_id: priorVerificationData.verification_id,
              verified_at: priorVerificationData.timestamp,
              candidate_name: priorVerificationData.candidate_name,
              target_role: priorVerificationData.target_role,
              verified_skills: priorVerificationData.verified_skills,
              verified_deliverables: priorVerificationData.verified_tasks,
            }
          : null,
      });

      // Update persistent session store
      setProjectChallenge({
        title: result.project_challenge.title,
        problem_statement: result.project_challenge.problem_statement,
        tech_stack_focus: result.project_challenge.tech_stack_focus,
      });

      // Ensure tasks are mapped with initial status open if not present
      const mappedTasks: TaskItem[] = result.tasks.map((t: any) => ({
        ...t,
        status: t.status || "open",
      }));

      setTasks(mappedTasks, result.evidence_summary);

      const preVerifiedCount = mappedTasks.filter((t) => t.status === "pre_verified").length;
      if (preVerifiedCount > 0) {
        toast.success("3-Sprint Spec Board Ready", {
          description: `${preVerifiedCount} tasks pre-verified from prior evaluation (${priorVerificationData?.verification_id}).`,
        });
      } else {
        toast.success("3-Sprint Kanban Spec Generated", {
          description: `Created 9 targeted tasks anchored in "${result.project_challenge.title}".`,
        });
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      if (err instanceof ApiClientError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg(err?.message || "Failed to generate sprint spec.");
      }
      toast.error("Generation Failed", { description: err?.message });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto sm:p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-muted text-foreground border border-border">
              <IconBulb className="size-4" />
            </div>
            <DialogTitle className="text-base sm:text-lg">
              Project Challenge Setup
            </DialogTitle>
          </div>
          <DialogDescription>
            Anchor the candidate's Kanban tickets in a concrete business problem scenario to evaluate authentic senior execution.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* AI Challenge Ideas Section Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold text-foreground">
                  AI Challenge Scenarios
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  4 distinct engineering problems generated for the candidate's skill gaps
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFetchAiIdeas}
                disabled={isFetchingIdeas || isGenerating}
                className="h-7 gap-1.5 px-2.5 text-xs font-medium border-border cursor-pointer"
              >
                {isFetchingIdeas ? (
                  <IconLoader2 className="size-3.5 animate-spin" />
                ) : (
                  <IconSparkles className="size-3.5 text-primary" />
                )}
                {isFetchingIdeas ? "Generating Ideas..." : "Regenerate Ideas"}
              </Button>
            </div>

            {/* Ideas Grid */}
            {isFetchingIdeas ? (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="flex flex-col justify-between rounded-lg border border-border bg-muted/20 p-3 space-y-2.5 animate-pulse min-h-[110px]"
                  >
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-3/4 rounded bg-muted-foreground/20" />
                      <div className="h-2.5 w-full rounded bg-muted-foreground/15" />
                      <div className="h-2.5 w-5/6 rounded bg-muted-foreground/15" />
                    </div>
                    <div className="flex gap-1.5">
                      <div className="h-4 w-16 rounded bg-muted-foreground/15" />
                      <div className="h-4 w-20 rounded bg-muted-foreground/15" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {ideas.map((idea) => {
                  const isSelected = selectedIdeaId === idea.id;
                  return (
                    <button
                      key={idea.id}
                      type="button"
                      onClick={() => handleSelectIdea(idea)}
                      className={`group flex flex-col justify-between rounded-lg border p-3 text-left transition-all cursor-pointer min-h-[110px] ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/40 shadow-2xs"
                          : "border-border bg-background hover:bg-muted/30"
                      }`}
                    >
                      <div>
                        <div className="flex w-full items-start justify-between gap-2">
                          <span className="text-xs font-semibold text-foreground line-clamp-1">
                            {idea.title}
                          </span>
                          {isSelected && (
                            <IconCheck className="size-3.5 text-primary shrink-0 stroke-[2.5] mt-0.5" />
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {idea.tagline || idea.problem_statement}
                        </p>
                      </div>

                      {idea.targeted_skills && idea.targeted_skills.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1">
                          {idea.targeted_skills.slice(0, 2).map((skill, idx) => (
                            <span
                              key={idx}
                              className="rounded border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Challenge Details (Review / Edit) */}
          <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                Selected Challenge Details
              </span>
              <span className="text-[11px] text-muted-foreground">
                Review or fine-tune before generating tasks
              </span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="challenge-title">Challenge Title</Label>
              <Input
                id="challenge-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Idempotent Transactional Ledger"
                className="border-border bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="problem-statement">Business Problem Scenario</Label>
              <Textarea
                id="problem-statement"
                value={problemStatement}
                onChange={(e) => setProblemStatement(e.target.value)}
                rows={3}
                placeholder="Explain the technical problem the candidate must solve..."
                className="text-xs leading-relaxed border-border bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tech-stack">Tech Stack Focus</Label>
              <Input
                id="tech-stack"
                value={techStack}
                onChange={(e) => setTechStack(e.target.value)}
                placeholder="e.g. FastAPI, PostgreSQL, Redis, Docker"
                className="border-border bg-background"
              />
            </div>
          </div>

          {errorMsg && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive">
              {errorMsg}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating || isFetchingIdeas}
            className="border-border"
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || isFetchingIdeas}
            className="gap-2 font-medium"
          >
            <IconSparkles className="size-4" />
            {isGenerating ? "Generating 3-Sprint Plan..." : "Generate Sprint Kanban"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
