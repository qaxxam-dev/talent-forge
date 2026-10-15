import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useTheme } from "next-themes";
import {
  IconCheck,
  IconFlame,
  IconMoon,
  IconRefresh,
  IconShieldCheck,
  IconSun,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSessionStore } from "@/stores/sessionStore";

const PIPELINE_STEPS = [
  { id: 1, name: "Intake", path: "/" },
  { id: 2, name: "Spec", path: "/kanban", altPath: "/repo-analysis" },
  { id: 3, name: "Viva", path: "/viva" },
  { id: 4, name: "Seal", path: "/seal" },
  { id: 5, name: "Dossier", path: "/dossier" },
];

export function WorkbenchHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const {
    skillGapAnalysis,
    batchCandidates,
    tasks,
    repoSummary,
    repoAnalysis,
    vivaQuestions,
    vivaAnswers,
    seal,
    dossier,
    clearSession,
  } = useSessionStore();

  // Determine stage completion
  const isStepComplete = (stepId: number) => {
    switch (stepId) {
      case 1:
        return !!skillGapAnalysis || (batchCandidates && batchCandidates.length > 0);
      case 2:
        return (
          tasks.filter((t) => t.status === "verified").length >= 2 ||
          !!repoSummary ||
          !!repoAnalysis
        );
      case 3:
        return Object.keys(vivaAnswers).length >= (vivaQuestions.length > 0 ? vivaQuestions.length : 1);
      case 4:
        return !!seal;
      case 5:
        return !!dossier;
      default:
        return false;
    }
  };

  const currentPath = location.pathname;

  const isCurrentStep = (step: (typeof PIPELINE_STEPS)[0]) => {
    if (step.id === 1) return currentPath === "/";
    if (step.id === 2) return currentPath === "/kanban" || currentPath === "/repo-analysis";
    return currentPath.startsWith(step.path);
  };

  const handleReset = () => {
    clearSession();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-card/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <IconFlame className="size-4.5" />
            </div>
            <span className="text-sm font-bold tracking-tight text-foreground">
              Talent<span className="text-primary">Forge</span>
            </span>
          </Link>
        </div>

        {/* Center: 5-Stage Stepper */}
        <nav className="hidden items-center gap-1.5 md:flex" aria-label="Pipeline Stepper">
          {PIPELINE_STEPS.map((step, idx) => {
            const active = isCurrentStep(step);
            const completed = isStepComplete(step.id);

            return (
              <React.Fragment key={step.id}>
                <div
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                    active
                      ? "border border-primary/40 bg-primary/10 text-primary font-semibold shadow-xs"
                      : completed
                      ? "text-foreground hover:bg-muted/60"
                      : "text-muted-foreground/60"
                  }`}
                >
                  <span
                    className={`flex size-4.5 items-center justify-center rounded-full text-[10px] font-bold ${
                      completed
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {completed ? <IconCheck className="size-3 stroke-[3]" /> : step.id}
                  </span>
                  <span>{step.name}</span>
                </div>
                {idx < PIPELINE_STEPS.length - 1 && (
                  <div className="h-0.5 w-2 bg-border/60" aria-hidden="true" />
                )}
              </React.Fragment>
            );
          })}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? (
                <IconSun className="size-4" />
              ) : (
                <IconMoon className="size-4" />
              )}
            </Button>
          )}

          {/* Reset Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 border-border/80 text-xs text-muted-foreground hover:text-foreground"
              >
                <IconRefresh className="size-3.5" />
                <span className="hidden sm:inline">New Session</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start New Candidate Session?</DialogTitle>
                <DialogDescription>
                  This will clear the current evaluation draft, sanitized profile, and generated
                  Kanban/Viva results from this session.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant="destructive" onClick={handleReset}>
                    Reset Evaluation
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
