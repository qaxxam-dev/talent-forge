import * as React from "react";
import {
  IconBulb,
  IconCheck,
  IconSparkles,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { api, ApiClientError } from "@/lib/api";
import { INDUSTRY_CHALLENGE_PRESETS } from "@/lib/challengePresets";
import { useSessionStore, type TaskItem } from "@/stores/sessionStore";

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

  const [selectedPresetId, setSelectedPresetId] = React.useState<string>(
    INDUSTRY_CHALLENGE_PRESETS[0].id
  );
  const [title, setTitle] = React.useState(
    projectChallenge?.title || INDUSTRY_CHALLENGE_PRESETS[0].title
  );
  const [problemStatement, setProblemStatement] = React.useState(
    projectChallenge?.problem_statement || INDUSTRY_CHALLENGE_PRESETS[0].problemStatement
  );
  const [techStack, setTechStack] = React.useState(
    projectChallenge?.tech_stack_focus || INDUSTRY_CHALLENGE_PRESETS[0].techStackFocus
  );
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Sync when preset is clicked
  const handleSelectPreset = (preset: (typeof INDUSTRY_CHALLENGE_PRESETS)[0]) => {
    setSelectedPresetId(preset.id);
    setTitle(preset.title);
    setProblemStatement(preset.problemStatement);
    setTechStack(preset.techStackFocus);
  };

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
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto sm:p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20">
              <IconBulb className="size-4" />
            </div>
            <DialogTitle className="text-base sm:text-lg">
              Project Challenge Setup
            </DialogTitle>
          </div>
          <DialogDescription>
            Anchor the candidate's Kanban tickets in a concrete business problem to prevent generic AI project hallucinations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Quick Preset Selector Cards */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Choose an Industry Challenge Preset (or customize below)
            </Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {INDUSTRY_CHALLENGE_PRESETS.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`flex flex-col items-start rounded-lg border p-3 text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/40 shadow-2xs"
                        : "border-border/60 bg-muted/20 hover:border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground truncate">
                        {preset.title}
                      </span>
                      {isSelected && (
                        <IconCheck className="size-3.5 text-primary shrink-0 stroke-[2.5]" />
                      )}
                    </div>
                    <span className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                      {preset.tagline}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="challenge-title">Challenge Title</Label>
              <Input
                id="challenge-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Idempotent Transactional Ledger"
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
                className="text-xs leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tech-stack">Tech Stack Focus (Optional)</Label>
              <Input
                id="tech-stack"
                value={techStack}
                onChange={(e) => setTechStack(e.target.value)}
                placeholder="e.g. FastAPI, PostgreSQL, Redis, Docker"
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
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
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
