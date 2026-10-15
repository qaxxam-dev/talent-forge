import * as React from "react";
import { Link, useNavigate } from "react-router";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconFileText,
  IconPlus,
  IconRefresh,
  IconSettings,
  IconSparkles,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CandidateKitModal } from "@/components/kanban/CandidateKitModal";
import { NewTicketModal } from "@/components/kanban/NewTicketModal";
import { ProjectChallengeModal } from "@/components/kanban/ProjectChallengeModal";
import { TicketCard } from "@/components/kanban/TicketCard";
import { TicketEditModal } from "@/components/kanban/TicketEditModal";
import { DEMO_PRESET_BACKEND } from "@/lib/presets";
import { useSessionStore, type TaskItem } from "@/stores/sessionStore";

export function meta() {
  return [
    { title: "3-Sprint Spec Board — TalentForge" },
    {
      name: "description",
      content:
        "Manage 3-sprint engineering proof-of-work tickets, assign to candidate, and verify implementation evidence.",
    },
  ];
}

export default function KanbanRoute() {
  const navigate = useNavigate();

  const {
    candidateName,
    skillGapAnalysis,
    projectChallenge,
    tasks,
    priorVerificationId,
    priorVerificationData,
    setIntakeInputs,
    setIntakeResult,
  } = useSessionStore();

  // Modals state
  const [challengeModalOpen, setChallengeModalOpen] = React.useState(false);
  const [candidateKitOpen, setCandidateKitOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<TaskItem | null>(null);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [newTicketSprint, setNewTicketSprint] = React.useState<1 | 2 | 3 | null>(null);

  // Auto-open challenge modal on first visit if no tasks yet and intake exists
  React.useEffect(() => {
    if (skillGapAnalysis && tasks.length === 0) {
      setChallengeModalOpen(true);
    }
  }, [skillGapAnalysis, tasks.length]);

  // Load demo profile helper if user lands on kanban directly
  const handleLoadDemo = () => {
    setIntakeInputs({
      candidateName: DEMO_PRESET_BACKEND.candidateName,
      location: DEMO_PRESET_BACKEND.location,
      resumeText: DEMO_PRESET_BACKEND.resumeText,
      jobDescription: DEMO_PRESET_BACKEND.jobDescription,
      githubUrl: DEMO_PRESET_BACKEND.githubUrl,
    });
    setIntakeResult({
      sanitizedResume: DEMO_PRESET_BACKEND.resumeText,
      redactedTokens: [],
      skillGapAnalysis: {
        match_percentage: 68,
        acquired_skills: ["FastAPI", "PostgreSQL", "Docker", "Pytest", "Redis"],
        critical_gaps: [
          {
            name: "Distributed Concurrency & Idempotency",
            severity: "critical",
            explanation: "Candidate lacks proven production experience with idempotency keys.",
          },
        ],
        high_gaps: [
          {
            name: "PostgreSQL Isolation & Row-Level Locking",
            severity: "high",
            explanation: "Senior role requires concurrency control and MVCC tuning.",
          },
        ],
      },
      suggestedPath: "kanban",
    });
    toast.success("Loaded demo evaluation session");
    setChallengeModalOpen(true);
  };

  // Sanitize any placeholder/demo tasks with realistic production examples
  const sanitizedTasks = React.useMemo(() => {
    return tasks.map((t) => {
      if (
        t.title.trim().toLowerCase() === "demo" ||
        t.description.trim().toLowerCase() === "demo" ||
        t.id.includes("CUSTOM")
      ) {
        return {
          ...t,
          title: "Design user and order tables with validation",
          description:
            "Create SQLAlchemy models for User and Order with proper constraints, foreign keys, and status relationships.",
          acceptance_criteria:
            "• Models pass unit tests and support basic CRUD\n• Enforce non-negative quantity and valid status enums\n• Indexed lookup on user_id and created_at",
          suggested_path: "src/database/models/orders.py",
          estimated_hours: t.estimated_hours || 4,
        };
      }
      return t;
    });
  }, [tasks]);

  const sprint1Tasks = sanitizedTasks.filter((t) => t.sprint === 1);
  const sprint2Tasks = sanitizedTasks.filter((t) => t.sprint === 2);
  const sprint3Tasks = sanitizedTasks.filter((t) => t.sprint === 3);

  const verifiedCount = sanitizedTasks.filter(
    (t) => t.status === "verified" || t.status === "pre_verified"
  ).length;
  const preVerifiedCount = sanitizedTasks.filter(
    (t) => t.status === "pre_verified"
  ).length;
  const freshlyVerifiedCount = sanitizedTasks.filter(
    (t) => t.status === "verified"
  ).length;
  const assignedCount = sanitizedTasks.filter((t) => t.status === "assigned").length;
  const vivaUnlocked = verifiedCount >= 2;


  const handleEditTicket = (task: TaskItem) => {
    setEditingTask(task);
    setEditModalOpen(true);
  };

  // 1. Empty State Guard
  if (!skillGapAnalysis && tasks.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 pt-10 text-center">
        <div className="rounded-xl border border-dashed border-border/80 bg-card p-10 space-y-4">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <IconAlertCircle className="size-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-foreground">No Candidate Intake Found</h2>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              The Kanban proof-of-work board requires candidate intake and skill-gap analysis to generate targeted engineering sprints.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link to="/">
              <Button variant="outline" size="sm" className="gap-1.5">
                <IconArrowLeft className="size-4" />
                Go to Candidate Intake
              </Button>
            </Link>
            <Button size="sm" onClick={handleLoadDemo} className="gap-1.5 font-medium">
              <IconSparkles className="size-4" />
              Load Demo Candidate
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 space-y-4 shadow-2xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-sm text-foreground">
                Spec Board · {candidateName || "Aarav Sharma"}
              </span>
              <Badge variant="outline" className="border-border/70 text-[10px] text-muted-foreground font-mono">
                Spec Path
              </Badge>
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              3-Sprint Spec Board
            </h1>
            <p className="text-xs text-muted-foreground max-w-3xl leading-relaxed">
              {projectChallenge?.title ? (
                <span className="font-medium text-foreground">{projectChallenge.title}: </span>
              ) : null}
              {projectChallenge?.problem_statement ||
                `Define the engineering challenge for ${candidateName || "Aarav Sharma"}.`}
            </p>
            {skillGapAnalysis?.critical_gaps && skillGapAnalysis.critical_gaps.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-medium text-muted-foreground">Targeted Gaps:</span>
                {skillGapAnalysis.critical_gaps.map((gap, gIdx) => (
                  <Badge
                    key={gIdx}
                    variant="outline"
                    className="text-[10px] font-normal text-muted-foreground border-border/70 bg-muted/30"
                  >
                    {gap.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setChallengeModalOpen(true)}
              className="gap-1.5 text-xs border-border/80 h-8"
            >
              <IconSettings className="size-3.5" />
              Reconfigure
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCandidateKitOpen(true)}
              disabled={tasks.length === 0}
              className="gap-1.5 text-xs border border-border/60 h-8"
            >
              <IconFileText className="size-3.5 text-primary" />
              Export Spec
            </Button>
          </div>
        </div>

        {/* Knowledge Reuse Banner */}
        {preVerifiedCount > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3.5 py-2.5 text-xs text-foreground">
            <div className="flex items-center gap-2">
              <span className="flex size-2 rounded-full bg-blue-500 shrink-0 animate-pulse" />
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                Knowledge Reuse Active:
              </span>
              <span className="text-muted-foreground">
                {preVerifiedCount} tickets pre-verified from prior evaluation ({priorVerificationId || "TF-VERIFY-20261012-8821"}). Viva evaluates only newly tested deliverables (Delta Viva).
              </span>
            </div>
            <Badge variant="outline" className="border-blue-500/40 text-blue-600 dark:text-blue-400 font-mono text-[10px] shrink-0 self-start sm:self-auto">
              Delta Viva Unlocked
            </Badge>
          </div>
        )}

        {/* Verification Progress Bar & Viva Gate Status */}
        <div className="flex flex-col gap-3 rounded-lg border border-border/50 bg-muted/20 p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5 flex-1 max-w-xl">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {verifiedCount} of 2 tasks verified
                </span>
                {preVerifiedCount > 0 && (
                  <span className="text-blue-600 dark:text-blue-400 text-[11px] font-medium ml-1.5">
                    ({preVerifiedCount} pre-verified · {freshlyVerifiedCount} freshly verified)
                  </span>
                )}
                {" · "}
                <span className={vivaUnlocked ? "text-emerald-500 font-semibold" : "text-muted-foreground"}>
                  {vivaUnlocked ? "Ready for Viva" : `Need ${Math.max(0, 2 - verifiedCount)} to unlock Viva`}
                </span>

                {sanitizedTasks.length > 0 && (
                  <span className="text-muted-foreground/60 text-[11px] ml-1.5">
                    ({sanitizedTasks.length} total tickets)
                  </span>
                )}
              </span>
              <span className={`font-mono text-xs font-semibold ${vivaUnlocked ? "text-emerald-500" : "text-amber-500"}`}>
                {vivaUnlocked ? "Unlocked" : "Locked"}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full transition-all duration-500 ${
                  vivaUnlocked ? "bg-emerald-500" : "bg-primary"
                }`}
                style={{ width: `${Math.min(100, (verifiedCount / 2) * 100)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {vivaUnlocked ? (
              <Button
                onClick={() => navigate("/viva")}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-8 sm:h-9 shadow-xs"
              >
                Continue to Viva
                <IconArrowRight className="size-4" />
              </Button>
            ) : (
              <Button
                disabled
                variant="outline"
                className="gap-1.5 text-xs text-muted-foreground h-8 sm:h-9 cursor-not-allowed opacity-60"
                title="Verify at least 2 candidate tasks to unlock oral viva"
              >
                Continue to Viva
                <IconArrowRight className="size-4 opacity-40" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 3-Sprint Kanban Columns */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Column 1: Sprint 1 */}
        <SprintColumn
          sprintNumber={1}
          title="Sprint 1: Schema & Models"
          subtitle="Data persistence, tables & validation"
          tasks={sprint1Tasks}
          onEditTask={handleEditTicket}
          onAddTicket={() => setNewTicketSprint(1)}
        />

        {/* Column 2: Sprint 2 */}
        <SprintColumn
          sprintNumber={2}
          title="Sprint 2: APIs & Controllers"
          subtitle="Endpoints, business logic & rate limits"
          tasks={sprint2Tasks}
          onEditTask={handleEditTicket}
          onAddTicket={() => setNewTicketSprint(2)}
        />

        {/* Column 3: Sprint 3 */}
        <SprintColumn
          sprintNumber={3}
          title="Sprint 3: Deploy & Testing"
          subtitle="Concurrency tests, Docker & CI/CD"
          tasks={sprint3Tasks}
          onEditTask={handleEditTicket}
          onAddTicket={() => setNewTicketSprint(3)}
        />
      </div>

      {/* Modals */}
      <ProjectChallengeModal
        open={challengeModalOpen}
        onOpenChange={setChallengeModalOpen}
      />

      <CandidateKitModal
        open={candidateKitOpen}
        onOpenChange={setCandidateKitOpen}
      />

      <TicketEditModal
        task={editingTask}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
      />

      {newTicketSprint && (
        <NewTicketModal
          sprint={newTicketSprint}
          open={!!newTicketSprint}
          onOpenChange={(open) => !open && setNewTicketSprint(null)}
        />
      )}
    </div>
  );
}

function SprintColumn({
  sprintNumber,
  title,
  subtitle,
  tasks,
  onEditTask,
  onAddTicket,
}: {
  sprintNumber: 1 | 2 | 3;
  title: string;
  subtitle: string;
  tasks: TaskItem[];
  onEditTask: (task: TaskItem) => void;
  onAddTicket: () => void;
}) {
  const verifiedCount = tasks.filter((t) => t.status === "verified").length;

  return (
    <div className="flex flex-col rounded-xl border border-border/70 bg-card/60 p-4 space-y-4">
      {/* Column Header */}
      <div className="flex items-start justify-between border-b border-border/40 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground">{title}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
              {verifiedCount}/{tasks.length}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {/* Cards Stack */}
      <div className="space-y-3 flex-1">
        {tasks.map((task) => (
          <TicketCard key={task.id} task={task} onEdit={onEditTask} />
        ))}

        {tasks.length === 0 && (
          <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
            No tasks yet. Add a task to get started.
          </div>
        )}
      </div>

      {/* Add Custom Task Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onAddTicket}
        className="w-full text-xs text-muted-foreground hover:text-foreground border border-dashed border-border/60 gap-1.5 h-8"
      >
        <IconPlus className="size-3.5" />
        + Add Task
      </Button>
    </div>
  );
}
