import * as React from "react";
import {
  IconCheck,
  IconClock,
  IconEdit,
  IconFileCode,
  IconLink,
  IconShieldCheck,
  IconUserCheck,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSessionStore, type TaskItem } from "@/stores/sessionStore";

interface TicketCardProps {
  task: TaskItem;
  onEdit: (task: TaskItem) => void;
  onVerify?: (task: TaskItem) => void;
}

export function TicketCard({ task, onEdit, onVerify }: TicketCardProps) {
  const { updateTaskStatus } = useSessionStore();

  const handleCycleStatus = () => {
    if (task.status === "open") {
      updateTaskStatus(task.id, "assigned");
    } else if (task.status === "assigned") {
      if (onVerify) {
        onVerify(task);
        return;
      }
      updateTaskStatus(task.id, "verified");
    } else if (task.status === "pre_verified") {
      updateTaskStatus(task.id, "open", "Reset for fresh verification by recruiter");
    } else {
      updateTaskStatus(task.id, "open");
    }
  };

  const getStatusBadge = () => {
    switch (task.status) {
      case "assigned":
        return (
          <Badge
            variant="outline"
            className="border-primary/40 bg-primary/10 text-primary text-[10px] font-mono uppercase tracking-wider"
          >
            Assigned
          </Badge>
        );
      case "verified":
        return (
          <Badge
            variant="outline"
            className="border-emerald-500/40 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 text-[10px] font-mono uppercase tracking-wider gap-1"
          >
            <IconCheck className="size-3 stroke-[3]" />
            Verified
          </Badge>
        );
      case "pre_verified":
        return (
          <Badge
            variant="outline"
            className="border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-mono uppercase tracking-wider gap-1"
          >
            <IconShieldCheck className="size-3 stroke-[2.5]" />
            Pre-Verified
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="border-border text-muted-foreground text-[10px] font-mono uppercase tracking-wider"
          >
            Open
          </Badge>
        );
    }
  };

  const getActionButton = () => {
    switch (task.status) {
      case "open":
        return (
          <Button
            size="sm"
            variant="default"
            onClick={handleCycleStatus}
            className="h-7 text-xs gap-1 font-medium shadow-2xs"
          >
            <IconUserCheck className="size-3.5" />
            Assign
          </Button>
        );
      case "assigned":
        return (
          <Button
            size="sm"
            variant="default"
            onClick={handleCycleStatus}
            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 font-medium shadow-2xs"
          >
            <IconCheck className="size-3.5 stroke-[2.5]" />
            Verify
          </Button>
        );
      case "verified":
        return (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCycleStatus}
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
          >
            Re-open
          </Button>
        );
      case "pre_verified":
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 flex items-center gap-1 font-semibold">
              <IconCheck className="size-3" />
              Carried Over
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCycleStatus}
              className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
              title="Force candidate to re-implement this task"
            >
              Re-test
            </Button>
          </div>
        );
    }
  };


  return (
    <Card className="group relative overflow-hidden border border-border/70 bg-card hover:border-border transition-all shadow-2xs">
      <CardContent className="p-4 space-y-3">
        {/* Top bar: ID, hours, and status badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-semibold text-muted-foreground">
              {task.id}
            </span>
            <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground/80">
              <IconClock className="size-3" />
              {task.estimated_hours}h
            </span>
          </div>
          {getStatusBadge()}
        </div>

        {/* Task Title & Description */}
        <div className="space-y-1">
          <h4 className="text-xs sm:text-sm font-semibold tracking-tight text-foreground leading-snug">
            {task.title}
          </h4>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        </div>

        {/* Acceptance Criteria snippet */}
        <div className="rounded-md border border-border/40 bg-muted/20 p-2.5 text-[11px] font-mono text-muted-foreground/90 space-y-1">
          <div className="font-sans text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Acceptance Criteria:
          </div>
          <div className="whitespace-pre-line leading-relaxed line-clamp-3">
            {task.acceptance_criteria}
          </div>
        </div>

        {/* Suggested File Path */}
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground truncate">
          <IconFileCode className="size-3.5 shrink-0 text-primary/70" />
          <span className="truncate">{task.suggested_path}</span>
        </div>

        {/* Pre-Verified Provenance Badge */}
        {task.pre_verified_source && (
          <div className="flex items-center gap-1.5 rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-[11px] text-blue-600 dark:text-blue-400 truncate">
            <IconShieldCheck className="size-3.5 shrink-0" />
            <span className="truncate font-mono">
              Carried over from {task.pre_verified_source.verification_id}
            </span>
          </div>
        )}

        {/* Notes / Submission Link if present */}
        {task.notes && !task.pre_verified_source && (
          <div className="flex items-center gap-1.5 rounded bg-primary/5 px-2 py-1 text-[11px] text-primary truncate">
            <IconLink className="size-3 shrink-0" />
            <span className="truncate">{task.notes}</span>
          </div>
        )}


        {/* AI Code Verification Result if verified */}
        {task.verification_score !== undefined && (
          <div className="flex items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
            <span className="font-semibold flex items-center gap-1">
              <IconShieldCheck className="size-3.5 stroke-[2.5]" />
              Audited: {task.verification_score}%
            </span>
            {task.rubric_feedback && (
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 truncate max-w-[150px]" title={task.rubric_feedback}>
                {task.rubric_feedback}
              </span>
            )}
          </div>
        )}

        {/* Bottom Action Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-border/40">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(task)}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <IconEdit className="size-3.5" />
            Edit
          </Button>
          {getActionButton()}
        </div>
      </CardContent>
    </Card>
  );
}
