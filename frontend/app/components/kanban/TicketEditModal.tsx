import * as React from "react";
import { IconTrash } from "@tabler/icons-react";
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

interface TicketEditModalProps {
  task: TaskItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TicketEditModal({
  task,
  open,
  onOpenChange,
}: TicketEditModalProps) {
  const { editTask, deleteTask } = useSessionStore();

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [hours, setHours] = React.useState(4);
  const [criteria, setCriteria] = React.useState("");
  const [path, setPath] = React.useState("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setHours(task.estimated_hours);
      setCriteria(task.acceptance_criteria);
      setPath(task.suggested_path);
      setNotes(task.notes || "");
    }
  }, [task]);

  if (!task) return null;

  const handleSave = () => {
    if (!title.trim()) {
      toast.error("Title cannot be empty");
      return;
    }

    editTask(task.id, {
      title,
      description,
      estimated_hours: Number(hours) || 4,
      acceptance_criteria: criteria,
      suggested_path: path,
      notes: notes.trim() || undefined,
    });

    toast.success("Ticket updated", { description: `${task.id} saved.` });
    onOpenChange(false);
  };

  const handleDelete = () => {
    deleteTask(task.id);
    toast.info("Ticket deleted", { description: `${task.id} removed from board.` });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:p-6">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold text-muted-foreground">
              {task.id} — Sprint {task.sprint}
            </span>
          </div>
          <DialogTitle className="text-base sm:text-lg">Edit Sprint Task</DialogTitle>
          <DialogDescription>
            Customize task parameters, acceptance criteria, or add candidate verification notes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-title">Task Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Design Ledger Table"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-desc">Description</Label>
            <Textarea
              id="edit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="text-xs"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-hours">Estimated Hours</Label>
              <Input
                id="edit-hours"
                type="number"
                min={1}
                max={40}
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-path">Suggested File Path</Label>
              <Input
                id="edit-path"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="src/models/ledger.py"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-criteria">Acceptance Criteria</Label>
            <Textarea
              id="edit-criteria"
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              rows={3}
              className="font-mono text-xs leading-relaxed"
            />
          </div>

          <div className="space-y-1.5 rounded-lg border border-border/60 bg-muted/20 p-3">
            <Label htmlFor="edit-notes">Recruiter Verification Notes / PR Link</Label>
            <Input
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. https://github.com/candidate/repo/pull/1 or 'Tested via curl'"
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter className="flex flex-row items-center justify-between gap-2 pt-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            className="gap-1.5 text-xs"
          >
            <IconTrash className="size-3.5" />
            Delete Ticket
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
