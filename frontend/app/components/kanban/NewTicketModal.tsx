import * as React from "react";
import { IconPlus } from "@tabler/icons-react";
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
import { useSessionStore, type TaskItem } from "@/stores/sessionStore";

interface NewTicketModalProps {
  sprint: 1 | 2 | 3;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewTicketModal({
  sprint,
  open,
  onOpenChange,
}: NewTicketModalProps) {
  const { tasks, addTask } = useSessionStore();

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [hours, setHours] = React.useState(4);
  const [criteria, setCriteria] = React.useState("");
  const [path, setPath] = React.useState("");

  const handleCreate = () => {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    const sprintTasks = tasks.filter((t) => t.sprint === sprint);
    const newId = `TF-S${sprint}-CUSTOM-${sprintTasks.length + 1}`;

    const newTask: TaskItem = {
      id: newId,
      sprint,
      title: title.trim(),
      description: description.trim(),
      estimated_hours: Number(hours) || 4,
      acceptance_criteria: criteria.trim() || "• Verify correct behavior against test suite.",
      suggested_path: path.trim() || `src/sprint${sprint}/`,
      status: "open",
    };

    addTask(newTask);
    toast.success("Ticket added", { description: `Added ${newId} to Sprint ${sprint}.` });
    onOpenChange(false);

    // Reset
    setTitle("");
    setDescription("");
    setHours(4);
    setCriteria("");
    setPath("");
  };

  const getSprintLabel = () => {
    switch (sprint) {
      case 1:
        return "Sprint 1: Schema & Models";
      case 2:
        return "Sprint 2: APIs & Controllers";
      case 3:
        return "Sprint 3: Deploy & Testing";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:p-6">
        <DialogHeader>
          <span className="font-mono text-xs font-semibold text-primary uppercase">
            {getSprintLabel()}
          </span>
          <DialogTitle className="text-base sm:text-lg">Add Custom Engineering Ticket</DialogTitle>
          <DialogDescription>
            Create an additional task for the candidate to implement during this sprint.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-title">Task Title</Label>
            <Input
              id="new-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Design user and order tables with validation"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-desc">Description</Label>
            <Textarea
              id="new-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="e.g. Create SQLAlchemy models for User and Order with proper constraints and relationships."
              className="text-xs"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-hours">Estimated Hours</Label>
              <Input
                id="new-hours"
                type="number"
                min={1}
                max={40}
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-path">Suggested File Path</Label>
              <Input
                id="new-path"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="src/database/models/orders.py"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-criteria">Acceptance Criteria</Label>
            <Textarea
              id="new-criteria"
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              rows={3}
              placeholder="• Models pass unit tests and support basic CRUD&#10;• Enforce non-negative quantity and status enums&#10;• Sub-10ms indexed lookup on user_id"
              className="font-mono text-xs leading-relaxed"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} className="gap-1.5">
            <IconPlus className="size-4" />
            Add Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
