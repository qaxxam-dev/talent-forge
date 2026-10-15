import * as React from "react";
import { Link } from "react-router";
import {
  IconArrowLeft,
  IconCheck,
  IconCopy,
  IconDownload,
  IconLock,
  IconPrinter,
  IconRefresh,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/sessionStore";

export function meta() {
  return [
    { title: "Candidate Verification Dossier — TalentForge" },
    {
      name: "description",
      content:
        "Executive Day-Zero verification report, commercial business impact translation, and standardized ATS package.",
    },
  ];
}

export default function DossierRoute() {
  const {
    activeCandidateId,
    candidateName,
    skillGapAnalysis,
    tasks,
    repoAnalysis,
    vivaAnswers,
    seal,
    dossier,
    priorVerificationId,
    priorVerificationData,
    setDossier,
  } = useSessionStore();

  const [isLoading, setIsLoading] = React.useState(false);
  const [copiedJson, setCopiedJson] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState(false);

  const activeName = candidateName || "Aarav Sharma";
  const activeRole = "Junior Backend Engineer";
  const activeId = activeCandidateId || "cand-001";
  const verificationId = seal?.verification_id || "TF-SEAL-20261014-07C9F054";

  const preVerifiedTasks = React.useMemo(() => {
    return tasks.filter((t) => t.status === "pre_verified");
  }, [tasks]);

  const freshlyVerifiedTasks = React.useMemo(() => {
    return tasks.filter((t) => t.status === "verified");
  }, [tasks]);

  const verifiedTasks = React.useMemo(() => {
    if (tasks.length > 0) {
      return tasks
        .filter((t) => t.status === "verified" || t.status === "pre_verified")
        .map((t) => `${t.id}: ${t.title}${t.status === "pre_verified" ? " [Pre-Verified]" : ""}`);
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

  // Auto-generate dossier on mount if missing
  React.useEffect(() => {
    async function loadDossier() {
      if (!dossier || dossier.candidate_label !== activeName) {
        setIsLoading(true);
        try {
          const res = await api.generateDossier({
            candidate_id: activeId,
            candidate_name: activeName,
            target_role: activeRole,
            match_percentage: skillGapAnalysis?.match_percentage || 88,
            verified_tasks: verifiedTasks,
            viva_marks: vivaMarks,
            remaining_gaps: skillGapAnalysis?.critical_gaps || [],
            seal: seal
              ? {
                  verification_id: seal.verification_id,
                  content_hash: seal.content_hash,
                  timestamp: seal.timestamp,
                }
              : undefined,
          });
          setDossier(res);
        } catch (err) {
          console.error("Failed to generate dossier", err);
          toast.error("Failed to assemble dossier");
        } finally {
          setIsLoading(false);
        }
      }
    }
    void loadDossier();
  }, [dossier, activeId, activeName, activeRole, skillGapAnalysis, verifiedTasks, vivaMarks, seal, setDossier]);

  const handleCopyJson = () => {
    if (dossier?.ats_export_payload) {
      navigator.clipboard.writeText(JSON.stringify(dossier.ats_export_payload, null, 2));
      setCopiedJson(true);
      toast.success("Copied ATS JSON Package to clipboard");
      setTimeout(() => setCopiedJson(false), 2000);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(verificationId);
    setCopiedId(true);
    toast.success("Copied Verification ID");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleDownloadJson = () => {
    if (!dossier?.ats_export_payload) return;
    const blob = new Blob([JSON.stringify(dossier.ats_export_payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `talentforge-dossier-${activeId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded ATS Dossier JSON");
  };

  const dayZeroScore = dossier?.day_zero_score || 91;

  return (
    <div className="mx-auto max-w-4xl space-y-6 print:m-0 print:max-w-none print:space-y-4 print:p-0">
      {/* Print-specific style rules */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 16mm;
          }
          body {
            background-color: #ffffff !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      {/* Screen Header (Hidden in Print) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link to="/seal">
            <Button variant="ghost" size="icon" className="size-8">
              <IconArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Candidate Verification Dossier
              </h1>
              <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
                Screen 5 — Executive Export
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Verified Day-Zero hiring signals and commercial impact for {activeName}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5"
            onClick={handleCopyJson}
            disabled={!dossier}
          >
            {copiedJson ? <IconCheck className="size-3.5" /> : <IconCopy className="size-3.5" />}
            {copiedJson ? "Copied" : "Copy ATS JSON"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5"
            onClick={handleDownloadJson}
            disabled={!dossier}
          >
            <IconDownload className="size-3.5" />
            Download JSON
          </Button>

          <Button
            size="sm"
            className="text-xs font-semibold h-8 gap-1.5 shadow-xs"
            onClick={() => window.print()}
          >
            <IconPrinter className="size-3.5" />
            Print Dossier
          </Button>
        </div>
      </div>

      {/* Print-Only Executive Letterhead */}
      <div className="hidden print:flex print:items-center print:justify-between print:border-b print:border-neutral-300 print:pb-3">
        <div>
          <span className="text-[11px] font-bold tracking-widest text-neutral-500 uppercase">
            TalentForge • Verification Dossier
          </span>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
            Executive Hiring Brief
          </h1>
        </div>
        <div className="text-right text-[10px] text-neutral-500 font-mono">
          <div>CONFIDENTIAL • RECRUITING AUDIT</div>
          <div>DATE: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</div>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-card p-16 text-center">
          <IconRefresh className="mx-auto size-7 animate-spin text-muted-foreground opacity-60 mb-3" />
          <p className="text-sm font-semibold text-foreground">Assembling Verification Dossier...</p>
          <p className="text-xs text-muted-foreground mt-1">
            Computing Day-Zero readiness score and business impact translations.
          </p>
        </div>
      ) : (
        <div className="space-y-5 print:space-y-4">
          {/* Executive Summary Hero Card */}
          <div className="rounded-xl border border-border/70 bg-card p-5 shadow-xs print:rounded-none print:border print:border-neutral-300 print:bg-white print:p-4 print:shadow-none">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-4 print:border-neutral-200 print:pb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {/* Status Indicator Dot: single 6px dot with ring */}
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-border/70 bg-muted/30 text-[11px] font-medium text-foreground print:border-neutral-300 print:bg-neutral-50">
                    <span className="relative flex h-2 w-2">
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500/80"></span>
                    </span>
                    <span>Verified Day-Zero</span>
                  </div>
                </div>

                <h2 className="text-xl font-bold tracking-tight text-foreground print:text-neutral-900 sm:text-2xl">
                  {activeName}
                </h2>

                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground print:text-neutral-600">
                  <span className="font-medium text-foreground print:text-neutral-900">{activeRole}</span>
                  <span>•</span>
                  <button
                    onClick={handleCopyId}
                    className="font-mono hover:text-foreground transition-colors inline-flex items-center gap-1"
                    title="Click to copy ID"
                  >
                    <IconLock className="size-3 text-muted-foreground" />
                    <span>{verificationId}</span>
                    {copiedId ? (
                      <IconCheck className="size-3 text-muted-foreground" />
                    ) : (
                      <IconCopy className="size-3 text-muted-foreground/60 print:hidden" />
                    )}
                  </button>
                </div>
              </div>

              {/* Day-Zero Score: Clean Monochrome Typography */}
              <div className="flex items-center gap-4 border border-border/60 bg-muted/20 rounded-lg p-3 shrink-0 print:border-neutral-300 print:bg-neutral-50 print:p-2.5">
                <div className="text-right">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Day-Zero Score
                  </span>
                  <span className="text-3xl font-extrabold font-mono text-foreground print:text-neutral-900 leading-none">
                    {dayZeroScore}
                    <span className="text-sm font-normal text-muted-foreground">/100</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Concise One-Sentence Executive Verdict */}
            <div className="mt-3.5 text-xs text-foreground/90 print:text-neutral-800 leading-relaxed border-l-2 border-foreground/30 pl-3 py-0.5">
              {dossier?.executive_summary ||
                `${activeName} demonstrated verified production readiness for ${activeRole}. Live oral viva defense and repository forensics confirmed authentic technical authorship.`}
            </div>
          </div>

          {/* Cumulative Verification Lineage Box */}
          {preVerifiedTasks.length > 0 && (
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-3 shadow-xs print:border-neutral-300 print:bg-neutral-50 print:break-inside-avoid">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-blue-500/20 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex size-2 rounded-full bg-blue-500" />
                  <h3 className="text-xs font-semibold text-foreground">
                    Cumulative Verification Lineage
                  </h3>
                  <Badge variant="outline" className="border-blue-500/40 text-blue-600 dark:text-blue-400 text-[10px] font-mono">
                    Prior Provenance Intact
                  </Badge>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Root ID: {priorVerificationId || "TF-VERIFY-20261012-8821"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1.5 rounded-lg border border-border/50 bg-background/50 p-2.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <IconCheck className="size-3" />
                    Pre-Verified Competencies ({preVerifiedTasks.length})
                  </div>
                  <ul className="space-y-1 text-[11px] text-muted-foreground">
                    {preVerifiedTasks.map((t) => (
                      <li key={t.id} className="flex items-center gap-1.5 truncate">
                        <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400">{t.id}</span>
                        <span className="truncate">{t.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1.5 rounded-lg border border-border/50 bg-background/50 p-2.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <IconCheck className="size-3" />
                    Freshly Tested Deliverables ({freshlyVerifiedTasks.length})
                  </div>
                  <ul className="space-y-1 text-[11px] text-muted-foreground">
                    {freshlyVerifiedTasks.length > 0 ? (
                      freshlyVerifiedTasks.map((t) => (
                        <li key={t.id} className="flex items-center gap-1.5 truncate">
                          <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">{t.id}</span>
                          <span className="truncate">{t.title}</span>
                        </li>
                      ))
                    ) : (
                      <li className="italic text-muted-foreground/70">
                        All required competencies fulfilled via pre-verified lineage.
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* 3 Commercial Impact Cards (Monochrome, Scannable) */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground print:text-neutral-800">
              Evaluated Business Impact & Risk Mitigation
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 print:grid-cols-3">
              {(dossier?.impacts || [
                {
                  technical_deliverable: "Containerized Asynchronous Ingestion Engine",
                  commercial_value: "Accelerates sprint onboarding velocity by an estimated 3 weeks without senior dev shadowing.",
                  risk_mitigated: "Prevents blocking I/O bottleneck incidents under peak campus volume traffic.",
                },
                {
                  technical_deliverable: "Relational Schema Normalization & Indexing",
                  commercial_value: "Guarantees sub-50ms query latency across multi-tenant database partitions.",
                  risk_mitigated: "Eliminates table scan performance degradation and connection pool starvation.",
                },
                {
                  technical_deliverable: "Live Code-Defend Oral Viva Verification",
                  commercial_value: "Delivers auditable verification of genuine authorship before client-facing interviews.",
                  risk_mitigated: "Shields the hiring organization against generative-AI plagiarism and inflated credentials.",
                },
              ]).map((impact, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-border/70 bg-card p-4 space-y-3 shadow-xs print:rounded-none print:border print:border-neutral-300 print:bg-white print:p-3 print:shadow-none print:break-inside-avoid"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex size-5 items-center justify-center rounded bg-muted text-muted-foreground text-[10px] font-bold font-mono">
                      0{idx + 1}
                    </div>
                    <span className="font-semibold text-foreground print:text-neutral-900 text-xs line-clamp-1">
                      {impact.technical_deliverable}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground print:text-neutral-500 tracking-wider block">
                        Commercial Value
                      </span>
                      <p className="text-muted-foreground print:text-neutral-700 leading-relaxed mt-0.5">
                        {impact.commercial_value}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-border/40 print:border-neutral-200">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground print:text-neutral-500 tracking-wider block">
                        Risk Mitigated
                      </span>
                      <p className="text-muted-foreground print:text-neutral-700 leading-relaxed mt-0.5">
                        {impact.risk_mitigated}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 30-Day Onboarding Ramp Focus */}
          <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3 shadow-xs print:rounded-none print:border print:border-neutral-300 print:bg-white print:p-3 print:shadow-none print:break-inside-avoid">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-foreground print:text-neutral-900">
                  30-Day Onboarding Ramp Focus
                </h3>
                <p className="text-[11px] text-muted-foreground print:text-neutral-500">
                  Recommended mentorship topics identified during oral defense.
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground print:border-neutral-300">
                Sprint 1 Ramp
              </Badge>
            </div>

            <div className="space-y-2">
              {(skillGapAnalysis?.critical_gaps || [
                {
                  name: "Kafka Event Partitioning",
                  severity: "critical" as const,
                  explanation: "Lacks experience handling high-throughput event rebalancing and key-based partitioning.",
                },
              ]).map((gap, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 p-2.5 text-xs print:border-neutral-200 print:bg-neutral-50"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground print:text-neutral-900">{gap.name}</span>
                      <Badge variant="outline" className="text-[9px] font-mono capitalize text-muted-foreground print:border-neutral-300">
                        {gap.severity}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground print:text-neutral-700 mt-0.5 leading-relaxed">
                      {gap.explanation}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                    Day 30
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ATS / HRMS Integration Export (Persistent Compact Drawer - Screen Only) */}
          <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3 shadow-xs print:hidden">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-foreground">
                  ATS / HRMS Integration Package
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Standardized JSON export compatible with Greenhouse, Lever, and Workday recruiting pipelines.
                </p>
              </div>
              <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={handleCopyJson}>
                {copiedJson ? <IconCheck className="size-3" /> : <IconCopy className="size-3" />}
                {copiedJson ? "Copied" : "Copy Payload"}
              </Button>
            </div>

            <pre className="max-h-36 overflow-y-auto rounded-lg border border-border/60 bg-muted/20 p-3 text-[11px] font-mono leading-relaxed text-muted-foreground">
              <code>{JSON.stringify(dossier?.ats_export_payload || {}, null, 2)}</code>
            </pre>
          </div>

          {/* Print Footer Stamp */}
          <div className="hidden print:flex print:items-center print:justify-between print:border-t print:border-neutral-300 print:pt-3 print:text-[10px] print:text-neutral-500 print:font-mono">
            <div>
              AUTH_SEAL: {verificationId} • HASH: {seal?.content_hash ? seal.content_hash.slice(0, 24) + "..." : "e3b0c44298fc1c149afbf4c8..."}
            </div>
            <div>VERIFIED VIA TALENTFORGE • PAGE 1 OF 1</div>
          </div>
        </div>
      )}
    </div>
  );
}

