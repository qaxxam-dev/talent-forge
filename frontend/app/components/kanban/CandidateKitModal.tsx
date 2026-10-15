import * as React from "react";
import { IconCheck, IconCopy, IconDownload, IconFileText } from "@tabler/icons-react";
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
import { useSessionStore } from "@/stores/sessionStore";

interface CandidateKitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CandidateKitModal({
  open,
  onOpenChange,
}: CandidateKitModalProps) {
  const {
    candidateName,
    jobDescription,
    projectChallenge,
    tasks,
  } = useSessionStore();

  const [copied, setCopied] = React.useState(false);

  const markdownKit = React.useMemo(() => {
    const title = projectChallenge?.title || "Engineering Proof-of-Work Challenge";
    const problem = projectChallenge?.problem_statement || "Implement transactional service architecture.";
    const stack = projectChallenge?.tech_stack_focus || "Standard Enterprise Stack";
    const candidate = candidateName || "Candidate";

    const sprint1 = tasks.filter((t) => t.sprint === 1);
    const sprint2 = tasks.filter((t) => t.sprint === 2);
    const sprint3 = tasks.filter((t) => t.sprint === 3);

    const renderSprint = (sprintNum: number, sprintTitle: string, sprintTasks: typeof tasks) => {
      let out = `## Sprint ${sprintNum}: ${sprintTitle}\n\n`;
      sprintTasks.forEach((t) => {
        out += `### [${t.id}] ${t.title} (${t.estimated_hours}h estimated)\n`;
        out += `**Status:** ${t.status.toUpperCase()}\n`;
        out += `**Description:** ${t.description}\n\n`;
        out += `**Suggested Path:** \`${t.suggested_path}\`\n\n`;
        out += `**Acceptance Signals:**\n${t.acceptance_criteria}\n\n---\n\n`;
      });
      return out;
    };

    return `# TalentForge Candidate Challenge Kit: ${title}

**Candidate:** ${candidate}  
**Challenge:** ${title}  
**Target Tech Stack:** ${stack}  
**Date Issued:** ${new Date().toISOString().split("T")[0]}  

---

## 1. Problem Scenario & Objective
${problem}

---

${renderSprint(1, "Schema & Models", sprint1)}
${renderSprint(2, "APIs & Controllers", sprint2)}
${renderSprint(3, "Deploy & Testing", sprint3)}

## 2. Submission Guidelines
1. Fork or initialize a clean repository adhering to the suggested directory structure.
2. Complete assigned sprint tasks with clean atomic git commits.
3. Ensure automated tests pass and include a concise README documenting setup instructions and architectural trade-offs.
4. Submit your public GitHub repository link or pull request URL back to your recruiting team for oral defense scheduling.
`;
  }, [candidateName, projectChallenge, tasks]);

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownKit);
    setCopied(true);
    toast.success("Challenge Kit Copied", {
      description: "Candidate brief markdown copied to clipboard.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([markdownKit], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Candidate-Challenge-Kit-${candidateName.replace(/\s+/g, "-") || "Brief"}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Downloaded Challenge Kit .md");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto sm:p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20">
              <IconFileText className="size-4" />
            </div>
            <DialogTitle className="text-base sm:text-lg">
              Candidate Challenge Kit
            </DialogTitle>
          </div>
          <DialogDescription>
            Exportable specification brief containing the problem scenario, sprint tickets, and submission guidelines to share with the candidate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <div className="max-h-96 overflow-y-auto rounded-lg border border-border/60 bg-muted/30 p-4 font-mono text-xs leading-relaxed text-foreground select-text whitespace-pre-wrap">
            {markdownKit}
          </div>
        </div>

        <DialogFooter className="flex flex-row items-center justify-between gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5 text-xs">
            <IconDownload className="size-3.5" />
            Download .md
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button size="sm" onClick={handleCopy} className="gap-1.5 font-medium">
              {copied ? <IconCheck className="size-3.5 stroke-[2.5]" /> : <IconCopy className="size-3.5" />}
              {copied ? "Copied to Clipboard!" : "Copy Brief to Clipboard"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
