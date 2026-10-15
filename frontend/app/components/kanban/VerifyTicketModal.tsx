import * as React from "react";
import {
  IconAlertTriangle,
  IconCheck,
  IconCode,
  IconRefresh,
  IconShieldCheck,
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
import { api } from "@/lib/api";
import { useSessionStore, type TaskItem } from "@/stores/sessionStore";

interface VerifyTicketModalProps {
  task: TaskItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VerifyTicketModal({
  task,
  open,
  onOpenChange,
}: VerifyTicketModalProps) {
  const { editTask } = useSessionStore();

  const [code, setCode] = React.useState("");
  const [prUrl, setPrUrl] = React.useState("");
  const [isAuditing, setIsAuditing] = React.useState(false);
  const [auditResult, setAuditResult] = React.useState<{
    is_verified: boolean;
    verification_score: number;
    rubric_feedback: string;
    strengths: string[];
    shortcomings: string[];
  } | null>(null);

  // Sync state when task changes
  React.useEffect(() => {
    if (task) {
      setCode(task.verified_code_snippet || "");
      setPrUrl(task.notes || "");
      if (task.verification_score) {
        setAuditResult({
          is_verified: task.status === "verified",
          verification_score: task.verification_score,
          rubric_feedback: task.rubric_feedback || "Previously verified deliverable.",
          strengths: ["Criteria verified against architectural standards."],
          shortcomings: [],
        });
      } else {
        setAuditResult(null);
      }
    }
  }, [task]);

  if (!task) return null;

  // Pre-fill realistic code snippet matching the task for fast demo testing
  const handlePreFillSample = () => {
    let sample = "";
    if (task.suggested_path.includes("models") || task.suggested_path.includes("table") || task.sprint === 1) {
      sample = `from sqlalchemy import Column, String, Numeric, DateTime, Index
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timezone
from src.database.base import Base

class LedgerEntry(Base):
    __tablename__ = "ledger_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    amount = Column(Numeric(precision=18, scale=4), nullable=False)
    idempotency_key = Column(String(64), unique=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_ledger_account_created", "account_id", "created_at"),
    )`;
    } else if (task.sprint === 2 || task.suggested_path.includes("api") || task.suggested_path.includes("service")) {
      sample = `from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.session import get_db
from src.models.ledger import LedgerEntry

router = APIRouter(prefix="/ledger", tags=["Ledger"])

@router.post("/transact", status_code=status.HTTP_201_CREATED)
async def post_transaction(payload: TransactionCreate, db: AsyncSession = Depends(get_db)):
    # Row-level locking to prevent race condition balance overdraft
    async with db.begin():
        account = await db.execute(
            select(Account).where(Account.id == payload.account_id).with_for_update()
        )
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        # Record entry with idempotency guarantee
        entry = LedgerEntry(account_id=payload.account_id, amount=payload.amount, idempotency_key=payload.key)
        db.add(entry)
    return {"status": "committed", "entry_id": str(entry.id)}`;
    } else {
      sample = `import pytest
from httpx import AsyncClient
from src.main import app

@pytest.mark.asyncio
async def test_idempotent_ledger_deduplication():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        payload = {"account_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d", "amount": 100.0, "key": "tx_idem_9921"}
        res1 = await ac.post("/ledger/transact", json=payload)
        assert res1.status_code == 201
        
        # Immediate replay with duplicate key must return duplicate status rather than double-crediting
        res2 = await ac.post("/ledger/transact", json=payload)
        assert res2.status_code in [200, 409]`;
    }

    setCode(sample);
    setPrUrl("https://github.com/candidate/project-repo/pull/1");
    toast.info("Loaded sample candidate implementation");
  };

  const handleAudit = async () => {
    if (!code.trim()) {
      toast.error("Please provide candidate code or implementation snippet.");
      return;
    }

    setIsAuditing(true);
    try {
      const res = await api.verifyTicket({
        task_id: task.id,
        task_title: task.title,
        acceptance_criteria: task.acceptance_criteria,
        suggested_path: task.suggested_path,
        code_content: code,
        pr_url: prUrl.trim() || undefined,
      });

      setAuditResult({
        is_verified: res.is_verified,
        verification_score: res.verification_score,
        rubric_feedback: res.rubric_feedback,
        strengths: res.strengths,
        shortcomings: res.shortcomings,
      });

      if (res.is_verified) {
        toast.success(`Verification Passed (${res.verification_score}%)`, {
          description: "Candidate code meets task acceptance criteria.",
        });
      } else {
        toast.warning(`Verification Rejected (${res.verification_score}%)`, {
          description: "Code lacks key criteria or architectural requirements.",
        });
      }
    } catch (err: any) {
      toast.error("Code audit failed", {
        description: err.message || "Failed to audit code against criteria.",
      });
    } finally {
      setIsAuditing(false);
    }
  };

  const handleConfirmVerification = () => {
    editTask(task.id, {
      status: "verified",
      verified_code_snippet: code.trim(),
      verification_score: auditResult?.verification_score || 90,
      rubric_feedback: auditResult?.rubric_feedback || "Candidate implementation verified.",
      notes: prUrl.trim() || undefined,
    });

    toast.success(`Ticket ${task.id} Marked Verified`, {
      description: "Code deliverable locked and bound for Viva defense.",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto sm:p-6">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold text-muted-foreground">
              {task.id} · Sprint {task.sprint}
            </span>
            <Badge variant="outline" className="text-[10px] uppercase font-mono">
              Target: {task.suggested_path}
            </Badge>
          </div>
          <DialogTitle className="text-base sm:text-lg">{task.title}</DialogTitle>
          <DialogDescription className="text-xs">
            Submit candidate source code or pull request to run automated forensic verification against criteria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Acceptance Criteria Box */}
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-1 text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
              <IconShieldCheck className="size-3.5 text-primary" />
              Acceptance Criteria to Satisfy
            </span>
            <p className="text-muted-foreground whitespace-pre-line leading-relaxed font-mono text-[11px]">
              {task.acceptance_criteria}
            </p>
          </div>

          {/* PR / Commit Link Input */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="verify-pr-url" className="text-xs">
                Candidate Pull Request or Commit URL (Optional)
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handlePreFillSample}
                className="h-6 text-[10px] text-primary gap-1 px-1.5"
              >
                <IconSparkles className="size-3" />
                Pre-fill Sample Implementation
              </Button>
            </div>
            <Input
              id="verify-pr-url"
              placeholder="https://github.com/candidate/repo/pull/1 or commit hash"
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              className="text-xs font-mono"
            />
          </div>

          {/* Source Code Textarea */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="verify-code" className="text-xs font-medium">
                Submitted Code Implementation / Git Diff
              </Label>
              <span className="text-[10px] font-mono text-muted-foreground">
                {code.split(/\n/).length} lines
              </span>
            </div>
            <Textarea
              id="verify-code"
              rows={9}
              placeholder="Paste candidate source code or git patch here..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="font-mono text-xs leading-relaxed border-border/80 bg-muted/10 resize-none"
            />
          </div>

          {/* Audit Results Card */}
          {auditResult && (
            <div
              className={`rounded-xl border p-4 space-y-2.5 text-xs transition-all ${
                auditResult.is_verified
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-destructive/30 bg-destructive/5"
              }`}
            >
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <span
                  className={`font-semibold text-sm flex items-center gap-1.5 ${
                    auditResult.is_verified
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-destructive"
                  }`}
                >
                  {auditResult.is_verified ? (
                    <IconCheck className="size-4 stroke-[3]" />
                  ) : (
                    <IconAlertTriangle className="size-4" />
                  )}
                  {auditResult.is_verified ? "Verification Approved" : "Criteria Not Satisfied"}
                </span>
                <Badge
                  variant="outline"
                  className={`font-mono text-xs ${
                    auditResult.is_verified
                      ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                      : "border-destructive text-destructive"
                  }`}
                >
                  Score: {auditResult.verification_score}%
                </Badge>
              </div>

              <p className="text-foreground/90 leading-relaxed font-medium">
                {auditResult.rubric_feedback}
              </p>

              {auditResult.strengths.length > 0 && (
                <div className="space-y-1 pt-1">
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                    Verified Capabilities
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-muted-foreground text-[11px]">
                    {auditResult.strengths.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {auditResult.shortcomings.length > 0 && (
                <div className="space-y-1 pt-1">
                  <span className="text-[11px] font-semibold text-destructive uppercase tracking-wider block">
                    Remaining Caveats / Viva Probes
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-muted-foreground text-[11px]">
                    {auditResult.shortcomings.map((c, idx) => (
                      <li key={idx}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isAuditing || !code.trim()}
            onClick={handleAudit}
            className="text-xs gap-1.5 font-semibold"
          >
            {isAuditing ? (
              <>
                <IconRefresh className="size-3.5 animate-spin" />
                Auditing Code...
              </>
            ) : (
              <>
                <IconCode className="size-3.5" />
                Audit with AI
              </>
            )}
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={!code.trim() || isAuditing}
            onClick={handleConfirmVerification}
            className="text-xs gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
          >
            <IconCheck className="size-3.5 stroke-[2.5]" />
            Lock Verified Deliverable
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
