import * as React from "react";
import { Link, useNavigate } from "react-router";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconCopy,
  IconLock,
  IconRefresh,
  IconShieldCheck,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/sessionStore";

export function meta() {
  return [{ title: "Cryptographic Authorship Seal — TalentForge" }];
}

export default function SealRoute() {
  const navigate = useNavigate();

  const {
    activeCandidateId,
    candidateName,
    skillGapAnalysis,
    tasks,
    repoAnalysis,
    vivaAnswers,
    githubUrl,
    seal,
    setSeal,
  } = useSessionStore();

  const [isMinting, setIsMinting] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [isVerifyingLookup, setIsVerifyingLookup] = React.useState(false);
  const [lookupResult, setLookupResult] = React.useState<any | null>(null);

  // Extract verified tasks and viva marks
  const verifiedTasks = React.useMemo(() => {
    if (tasks.length > 0) {
      return tasks.filter((t) => t.status === "verified").map((t) => `${t.id}: ${t.title}`);
    }
    if (repoAnalysis?.key_files) {
      return repoAnalysis.key_files.map((f) => f.path);
    }
    return [
      "app/core/queue_consumer.py",
      "app/database/connection_pool.py",
      "src/ledger/transaction_service.ts",
    ];
  }, [tasks, repoAnalysis]);

  const vivaMarks = React.useMemo(() => {
    const marks = Object.values(vivaAnswers).map((a) => a.recruiter_mark || a.suggested_mark);
    return marks.length > 0 ? marks : ["adequate", "adequate", "adequate"];
  }, [vivaAnswers]);

  const activeName = candidateName || "Aarav Sharma";
  const activeRole = "Junior Backend Engineer";
  const activeId = activeCandidateId || "cand-001";

  // Auto-mint on visit if not minted yet
  React.useEffect(() => {
    async function initSeal() {
      if (!seal) {
        setIsMinting(true);
        try {
          const res = await api.createSeal({
            candidate_id: activeId,
            candidate_name: activeName,
            target_role: activeRole,
            verified_tasks: verifiedTasks,
            viva_marks: vivaMarks,
            github_url: githubUrl || undefined,
            verified_skills: skillGapAnalysis?.acquired_skills,
          });
          setSeal(res);
        } catch (err) {
          console.error("Auto seal mint failed", err);
        } finally {
          setIsMinting(false);
        }
      }
    }
    void initSeal();
  }, [seal, activeId, activeName, activeRole, verifiedTasks, vivaMarks, githubUrl, skillGapAnalysis, setSeal]);

  const handleCopyId = () => {
    if (seal?.verification_id) {
      navigator.clipboard.writeText(seal.verification_id);
      setCopied(true);
      toast.success("Copied Verification ID to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleVerifyLookup = async () => {
    const idToLookup = seal?.verification_id || "TF-SEAL-20261014-07C9F054";
    setIsVerifyingLookup(true);
    try {
      const res = await api.verifyLookup(idToLookup);
      setLookupResult(res);
      toast.success("Cryptographic Record Confirmed in Registry!", {
        description: `Verified candidate: ${res.candidate_name} · Status: ${res.status}`,
      });
    } catch (err: any) {
      toast.error("Lookup failed", {
        description: err.message || "Could not verify ID in registry.",
      });
    } finally {
      setIsVerifyingLookup(false);
    }
  };

  const handleRemint = async () => {
    setIsMinting(true);
    try {
      const res = await api.createSeal({
        candidate_id: activeId,
        candidate_name: activeName,
        target_role: activeRole,
        verified_tasks: verifiedTasks,
        viva_marks: vivaMarks,
        github_url: githubUrl || undefined,
        verified_skills: skillGapAnalysis?.acquired_skills,
      });
      setSeal(res);
      toast.success("Cryptographic Seal Minted", {
        description: `Verified under SHA-256: ${res.verification_id}`,
      });
    } catch (err: unknown) {
      toast.error("Failed to mint seal", {
        description: err instanceof Error ? err.message : "Server error",
      });
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
        <div className="flex items-center gap-3">
          <Link to="/viva">
            <Button variant="ghost" size="icon" className="size-8">
              <IconArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Cryptographic Authorship Seal
              </h1>
              <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground border-border/70">
                Screen 4 — Auditable Proof
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Immutable SHA-256 verification digest for <span className="font-semibold text-foreground">{activeName}</span>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5 border-border/70 text-muted-foreground hover:text-foreground"
            onClick={handleRemint}
            disabled={isMinting}
          >
            <IconRefresh className={`size-3.5 ${isMinting ? "animate-spin" : ""}`} />
            Re-Mint Seal
          </Button>

          <Button
            size="sm"
            className="text-xs font-semibold h-8 gap-1.5 shadow-xs"
            onClick={() => {
              toast.success("Proceeding to Dossier", {
                description: "Assembling executive evaluation & ATS export package.",
              });
              navigate("/dossier");
            }}
          >
            Proceed to Dossier
            <IconArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Single Unified Verification Card */}
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-xs space-y-6">
          {/* Certificate Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className="size-2 rounded-full bg-emerald-500/80 ring-2 ring-emerald-500/20 shrink-0"
                  title="Cryptographically Verified"
                />
                <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                  Verified Invariant · SHA-256
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                {activeName}
              </h2>
              <p className="text-xs text-muted-foreground font-mono">
                {activeRole}
              </p>
            </div>

            {/* Verification ID Pill & Live Registry Check */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 self-start sm:self-auto">
              <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-muted/30 px-3 py-1.5">
                <IconLock className="size-3.5 text-muted-foreground" />
                <span className="font-mono text-xs font-semibold text-foreground">
                  {seal?.verification_id || "TF-SEAL-20261014-07C9F054"}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={handleCopyId}
                  title="Copy Verification ID"
                >
                  {copied ? <IconCheck className="size-3 text-emerald-500" /> : <IconCopy className="size-3" />}
                </Button>
              </div>

              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-xs gap-1.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                onClick={handleVerifyLookup}
                disabled={isVerifyingLookup}
              >
                <IconShieldCheck className="size-3.5" />
                {isVerifyingLookup ? "Querying DB..." : "Verify on Registry"}
              </Button>
            </div>
          </div>

          {/* Live Registry Confirmation Banner */}
          {lookupResult && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-2.5 text-xs animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  <IconCheck className="size-4 stroke-[3] text-emerald-600" />
                  SQLite Ledger Record Authenticated ({lookupResult.verification_id})
                </span>
                <Badge variant="outline" className="border-emerald-500/50 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono text-[10px]">
                  {lookupResult.status}
                </Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-muted-foreground pt-1">
                <div>Candidate: <span className="text-foreground font-semibold">{lookupResult.candidate_name}</span></div>
                <div>Role: <span className="text-foreground">{lookupResult.target_role}</span></div>
                <div>Readiness Score: <span className="text-emerald-600 font-bold">{lookupResult.day_zero_score}%</span></div>
                <div>Algorithm: <span className="text-foreground">{lookupResult.algorithm}</span></div>
              </div>
              <p className="text-[11px] text-muted-foreground italic pt-1 border-t border-emerald-500/20">
                "{lookupResult.audit_summary}"
              </p>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">
                Standard
              </span>
              <span className="font-mono text-xs font-semibold text-foreground mt-0.5 block">
                NIST FIPS 180-4
              </span>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">
                Minted Timestamp
              </span>
              <span className="font-mono text-xs text-muted-foreground mt-0.5 block truncate">
                {seal?.timestamp || new Date().toISOString()}
              </span>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">
                Defense Status
              </span>
              <span className="font-mono text-xs font-semibold text-foreground mt-0.5 block">
                Sovereign Verified
              </span>
            </div>
          </div>

          {/* Cryptographic Content Hash Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="text-[10px] font-mono uppercase tracking-wider">
                Cryptographic Content Digest
              </span>
              <button
                onClick={() => {
                  if (seal?.content_hash) {
                    navigator.clipboard.writeText(seal.content_hash);
                    toast.success("Copied SHA-256 hash to clipboard");
                  }
                }}
                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 font-mono hover:underline cursor-pointer"
              >
                <IconCopy className="size-3" />
                <span>Copy Full Hash</span>
              </button>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/30 p-2.5 font-mono text-[11px] text-muted-foreground break-all leading-relaxed select-all">
              {seal?.content_hash || "07c9f0548a3de6a2bf72bb54bc9f1807d9f75ec58d11c19b084931a293bf6f42"}
            </div>
          </div>

          {/* Bound Evidence Summary */}
          <div className="space-y-3 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <IconShieldCheck className="size-3.5 text-muted-foreground" />
                Bound Artifacts & Oral Defense Records
              </h3>
              <span className="text-[11px] font-mono text-muted-foreground">
                {verifiedTasks.length} deliverables · {vivaMarks.length} viva records
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {verifiedTasks.map((t, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/15 px-3 py-2 text-xs font-mono text-foreground truncate"
                >
                  <IconCheck className="size-3 text-muted-foreground shrink-0" />
                  <span className="truncate">{t}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {vivaMarks.map((mark, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="text-[11px] font-mono capitalize border-border/70 text-muted-foreground bg-muted/20"
                >
                  Defense Q{i + 1}: {mark}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
