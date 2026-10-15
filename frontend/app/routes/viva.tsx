import * as React from "react";
import { Link, useNavigate } from "react-router";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconCheckbox,
  IconCornerDownRight,
  IconFileText,
  IconInfoCircle,
  IconKeyboard,
  IconLoader2,
  IconMicrophone,
  IconMicrophoneOff,
  IconPlayerPause,
  IconPlayerPlay,
  IconRefresh,
  IconShieldCheck,
  IconSparkles,
  IconSquare,
  IconVolume,
  IconWaveSine,
  IconX,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiClientError } from "@/lib/api";
import {
  useSessionStore,
  type RubricCheck,
  type RubricItem,
  type VivaAnswerRecord,
  type VivaQuestion,
} from "@/stores/sessionStore";

export function meta() {
  return [{ title: "Screen 3 — Oral Viva Defense | TalentForge" }];
}

const ASYNC_QUESTIONS = [
  {
    id: "async-q1",
    num: 1,
    title: "Queue Consumer & Concurrency Control",
    question: "How did you structure the asynchronous background worker to prevent database connection pool starvation under peak campus traffic?",
    artifact: "app/core/queue_consumer.py",
    duration: "01:14",
    durationSeconds: 74,
    recordedAt: "Today, 14:22:08 UTC",
    transcript: "In app/core/queue_consumer.py, I used an asynchronous semaphore bounded to 20 concurrent tasks, and implemented an exponential backoff retry. For database transactions, we utilized SQLAlchemy async session contexts with pre_ping=True, ensuring idle connections are reclaimed rather than starving the pool.",
    suggestedMark: "adequate",
    score: 88,
    defenseAngle: "Validates bounded async concurrency and pre_ping connection pooling under high peak campus concurrency.",
  },
  {
    id: "async-q2",
    num: 2,
    title: "Relational Advisory Locks vs Cache Mutex",
    question: "Why did you choose PostgreSQL advisory locks rather than an in-memory Redis mutex for double-entry ledger transactions?",
    artifact: "src/ledger/transaction_service.ts",
    duration: "00:58",
    durationSeconds: 58,
    recordedAt: "Today, 14:24:19 UTC",
    transcript: "Redis distributed locks introduce network partition failure risks and potential split-brain if the lock TTL expires mid-transaction. By using PostgreSQL advisory locks within the same relational transaction boundary, lock release is strictly tied to the commit/rollback lifecycle, guaranteeing zero unbalanced entries.",
    suggestedMark: "adequate",
    score: 92,
    defenseAngle: "Defends transactional consistency guarantees over network-partitioned cache mutexes.",
  },
  {
    id: "async-q3",
    num: 3,
    title: "Broker Disconnect & Deduplication Key",
    question: "If the upstream message queue broker disconnects mid-ingestion, how does your consumer guarantee at-least-once delivery without duplicating state?",
    artifact: "Dockerfile & queue_worker.py",
    duration: "01:05",
    durationSeconds: 65,
    recordedAt: "Today, 14:27:42 UTC",
    transcript: "Each ingested payload is assigned a deterministic SHA-256 idempotency key stored in Redis with an atomic SETNX check. If the consumer dies before sending an ACK, the re-delivered message hits the deduplication filter, logs a duplicate warning, and skips re-execution.",
    suggestedMark: "adequate",
    score: 86,
    defenseAngle: "Demonstrates hands-on mastery of deterministic idempotency keys and at-least-once message deduplication.",
  },
];

interface AudioWaveformProps {
  durationSeconds: number;
  durationLabel: string;
  recordedAt: string;
}

function ShadcnAudioWaveform({
  durationSeconds,
  durationLabel,
  recordedAt,
}: AudioWaveformProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [playbackSpeed, setPlaybackSpeed] = React.useState<1 | 1.5 | 2>(1);

  const barHeights = React.useMemo(() => [
    18, 22, 28, 36, 45, 52, 65, 78, 85, 92,
    70, 58, 74, 88, 96, 100, 90, 78, 64, 52,
    68, 82, 94, 86, 72, 60, 48, 66, 80, 88,
    76, 62, 50, 42, 55, 70, 84, 75, 60, 48,
    38, 30, 24, 28, 22, 18, 16, 14,
  ], []);

  React.useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 0.1 * playbackSpeed;
          if (next >= durationSeconds) {
            setIsPlaying(false);
            return durationSeconds;
          }
          return next;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, durationSeconds]);

  const progress = Math.min(1, currentTime / durationSeconds);
  const currentMinutes = Math.floor(currentTime / 60);
  const currentSecs = Math.floor(currentTime % 60);
  const formattedCurrent = `${String(currentMinutes).padStart(2, "0")}:${String(currentSecs).padStart(2, "0")}`;

  const handleBarClick = (index: number) => {
    const targetProgress = index / barHeights.length;
    setCurrentTime(targetProgress * durationSeconds);
  };

  const toggleSpeed = () => {
    setPlaybackSpeed((prev) => (prev === 1 ? 1.5 : prev === 1.5 ? 2 : 1));
  };

  return (
    <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3 shadow-xs">
      {/* Top Header of Waveform */}
      <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/50 pb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground text-xs">Audio Recording Waveform</span>
          <span>•</span>
          <span className="text-[11px] text-muted-foreground">{recordedAt}</span>
        </div>
        <span className="font-mono text-[11px] bg-muted/60 px-2 py-0.5 rounded text-foreground">
          {formattedCurrent} / {durationLabel}
        </span>
      </div>

      {/* Multi-Bar Capsule Audio Waveform */}
      <div className="h-14 flex items-center justify-between gap-1 px-2 py-1.5 bg-muted/20 rounded-lg select-none">
        {barHeights.map((h, i) => {
          const barProgress = i / barHeights.length;
          const isPassed = barProgress <= progress;

          return (
            <div
              key={i}
              onClick={() => handleBarClick(i)}
              className="flex-1 flex items-center justify-center h-full cursor-pointer group"
              title={`Seek to ${Math.round(barProgress * 100)}%`}
            >
              <div
                className={`w-1 rounded-full transition-all duration-150 ${
                  isPassed
                    ? "bg-foreground"
                    : "bg-muted-foreground/25 group-hover:bg-muted-foreground/50"
                }`}
                style={{
                  height: `${h}%`,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Controls Row */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="default"
            className="size-8 rounded-full p-0 shadow-xs"
            onClick={() => {
              if (currentTime >= durationSeconds) {
                setCurrentTime(0);
              }
              setIsPlaying(!isPlaying);
            }}
          >
            {isPlaying ? (
              <IconPlayerPause className="size-4" />
            ) : (
              <IconPlayerPlay className="size-4 ml-0.5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs font-mono text-muted-foreground hover:text-foreground px-2"
            onClick={() => {
              setCurrentTime(0);
              setIsPlaying(false);
            }}
          >
            Reset
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[11px] font-mono border-border/70 text-muted-foreground hover:text-foreground"
            onClick={toggleSpeed}
            title="Toggle playback speed"
          >
            {playbackSpeed}x Speed
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function VivaRoute() {
  const navigate = useNavigate();
  const {
    jobDescription,
    skillGapAnalysis,
    tasks,
    evidenceSummary,
    vivaQuestions,
    vivaAnswers,
    vivaConsentGiven,
    priorVerificationId,
    priorVerificationData,
    setVivaConsent,
    setVivaQuestions,
    addVivaQuestion,
    recordVivaAnswer,
    setEvidenceSummary,
  } = useSessionStore();

  const preVerifiedCount = tasks.filter((t) => t.status === "pre_verified").length;


  // Navigation & Question State
  const [currentIdx, setCurrentIdx] = React.useState(0);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isEvaluating, setIsEvaluating] = React.useState(false);

  // Audio / Speech State
  const [isRecording, setIsRecording] = React.useState(false);
  const [speechSupported, setSpeechSupported] = React.useState(true);
  const [liveTranscript, setLiveTranscript] = React.useState("");
  const recognitionRef = React.useRef<any>(null);

  // Fallback Mode State
  const [isTypedMode, setIsTypedMode] = React.useState(false);
  const [typedText, setTypedText] = React.useState("");

  // Recruiter Mark Override State
  const [recruiterMark, setRecruiterMark] = React.useState<"adequate" | "weak" | "none">("adequate");

  // Check speech recognition support on mount
  React.useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setIsTypedMode(true);
    }
  }, []);

  const activeQuestion: VivaQuestion | undefined = vivaQuestions[currentIdx];
  const activeAnswer: VivaAnswerRecord | undefined =
    activeQuestion ? vivaAnswers[activeQuestion.id] : undefined;

  // Initialize questions if empty
  const handleGenerateViva = async () => {
    setIsGenerating(true);
    try {
      const verifiedTasks = tasks.filter((t) => t.status === "verified");
      const claimedArtifacts =
        verifiedTasks.length > 0
          ? verifiedTasks.map((t) => `${t.id}: ${t.title} (${t.suggested_path})`)
          : [
              "TF-SPRINT1-01: Ledger balance schema & row locking (src/models/ledger.py)",
              "TF-SPRINT2-02: Idempotency middleware & cache check (src/middleware/idempotency.py)",
              "TF-SPRINT3-01: Transaction retry worker & circuit breaker (src/workers/ledger_worker.py)",
            ];

      const summary =
        evidenceSummary ||
        "Candidate completed full 3-sprint implementation of high-throughput financial ledger engine with PostgreSQL row-level locks, Redis token caching, and circuit breaker retry patterns.";

      if (!evidenceSummary) {
        setEvidenceSummary(summary);
      }

      const res = await api.generateViva({
        role_title: "Senior Backend Engineer",
        job_description: jobDescription || "Fintech backend engineer responsible for ledger accuracy",
        evidence_summary: summary,
        claimed_artifacts: claimedArtifacts,
      });

      if (res.questions && res.questions.length > 0) {
        setVivaQuestions(res.questions);
        setCurrentIdx(0);
        toast.success(`Generated ${res.questions.length} adaptive viva defense questions.`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate viva questions");
    } finally {
      setIsGenerating(false);
    }
  };

  // Start / Stop Web Speech Recognition
  const toggleRecording = () => {
    if (isRecording) {
      // Stop
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
    } else {
      // Start
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        toast.error("Browser speech recognition not supported. Switched to typed fallback.");
        setIsTypedMode(true);
        return;
      }

      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onstart = () => {
          setIsRecording(true);
        };

        recognition.onresult = (event: any) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          setLiveTranscript((prev) => {
            const combined = (prev + " " + finalTranscript).trim();
            return interimTranscript ? `${combined} ${interimTranscript}` : combined;
          });
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          if (event.error !== "no-speech") {
            toast.error(`Microphone error: ${event.error}`);
            setIsRecording(false);
          }
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err: any) {
        toast.error("Could not access microphone.");
        setIsRecording(false);
      }
    }
  };

  // Submit Answer for Rubric Evaluation
  const handleSubmitDefense = async () => {
    if (!activeQuestion) return;

    const transcriptToSubmit = isTypedMode ? typedText.trim() : liveTranscript.trim();
    if (!transcriptToSubmit) {
      toast.error("Please provide candidate response (voice transcript or typed answer).");
      return;
    }

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    setIsEvaluating(true);
    try {
      const isFinal =
        activeQuestion.question_type === "requirement_mutation" ||
        activeQuestion.question_type === "adaptive_followup" ||
        currentIdx === vivaQuestions.length - 1;

      const evalRes = await api.evaluateDefense({
        question: activeQuestion,
        transcript: transcriptToSubmit,
        delivery_mode: isTypedMode ? "typed_fallback" : "voice",
        is_final_question: isFinal,
      });

      const answerRecord: VivaAnswerRecord = {
        question_id: activeQuestion.id,
        transcript: transcriptToSubmit,
        delivery_mode: isTypedMode ? "typed_fallback" : "voice",
        score: evalRes.score,
        suggested_mark: evalRes.suggested_mark,
        recruiter_mark: evalRes.suggested_mark,
        rationale: evalRes.rationale,
        rubric_coverage: evalRes.rubric_coverage,
        dynamic_follow_up: evalRes.dynamic_follow_up,
      };

      recordVivaAnswer(answerRecord);
      setRecruiterMark(evalRes.suggested_mark);

      // If Gemini returned a dynamic follow-up, insert it right after currentIdx if not already added
      if (evalRes.dynamic_follow_up) {
        const followUpExists = vivaQuestions.some(
          (q) => q.id === evalRes.dynamic_follow_up?.id
        );
        if (!followUpExists) {
          const updatedQuestions = [...vivaQuestions];
          updatedQuestions.splice(currentIdx + 1, 0, evalRes.dynamic_follow_up);
          setVivaQuestions(updatedQuestions);
          toast.info("Adaptive Follow-up generated based on candidate's transcript!");
        }
      }

      toast.success(`Evaluated candidate defense. Score: ${evalRes.score}/5`);
    } catch (err: any) {
      toast.error(err.message || "Failed to evaluate defense");
    } finally {
      setIsEvaluating(false);
    }
  };

  // Recruiter confirms or updates mark
  const handleUpdateMark = (newMark: "adequate" | "weak" | "none") => {
    if (!activeQuestion || !activeAnswer) return;
    setRecruiterMark(newMark);
    recordVivaAnswer({
      ...activeAnswer,
      recruiter_mark: newMark,
    });
  };

  // Count answered questions
  const totalQuestions = vivaQuestions.length;
  const answeredCount = Object.keys(vivaAnswers).length;
  const isAllAnswered = totalQuestions > 0 && answeredCount >= totalQuestions;

  // Dual Mode: Live Voice Defense vs Async Review Mode
  const [vivaDisplayMode, setVivaDisplayMode] = React.useState<"live" | "async">("live");
  const [activeAsyncIdx, setActiveAsyncIdx] = React.useState(0);

  const handleGradeAsync = (turn: (typeof ASYNC_QUESTIONS)[0], grade: "adequate" | "weak" | "none") => {
    const mockAns: VivaAnswerRecord = {
      question_id: turn.id,
      transcript: turn.transcript,
      delivery_mode: "voice",
      score: turn.score,
      suggested_mark: "adequate",
      recruiter_mark: grade,
      rationale: "Recruiter reviewed async candidate transcript and verified defense.",
      rubric_coverage: [
        { rubric_id: `r-${turn.id}`, criterion: "Candidate defense", hit: grade === "adequate", citation: turn.transcript.slice(0, 45) },
      ],
    };
    recordVivaAnswer(mockAns);
    toast.success(`Marked Question ${turn.num} as ${grade.toUpperCase()}`);
  };

  const handleBatchApproveAsync = () => {
    const mockAnswers: Record<string, VivaAnswerRecord> = {};
    const mockQuestions: VivaQuestion[] = [];

    ASYNC_QUESTIONS.forEach((item, i) => {
      const qObj: VivaQuestion = {
        id: item.id,
        question_text: item.question,
        referenced_artifact: item.artifact,
        question_type: i === 1 ? "tradeoff" : "architectural",
        rubric: [
          { id: `r-${i}-1`, text: "Validates architecture trade-offs", expected_signal: "Concrete system mechanics" },
          { id: `r-${i}-2`, text: "Defends code artifact implementation", expected_signal: "Direct code citation" },
        ],
      };
      mockQuestions.push(qObj);

      mockAnswers[item.id] = {
        question_id: item.id,
        transcript: item.transcript,
        delivery_mode: "voice",
        score: item.score,
        suggested_mark: "adequate",
        recruiter_mark: "adequate",
        rationale: "Strong technical defense demonstrating hands-on ownership of code artifacts.",
        rubric_coverage: [
          { rubric_id: `r-${i}-1`, criterion: "Architecture trade-offs", hit: true, citation: item.transcript.slice(0, 45) },
          { rubric_id: `r-${i}-2`, criterion: "Artifact citations", hit: true, citation: item.transcript.slice(46, 95) },
        ],
      };
    });

    setVivaQuestions(mockQuestions);
    Object.values(mockAnswers).forEach((ans) => recordVivaAnswer(ans));
    toast.success("Batch Approved Candidate Defenses", {
      description: "All 3 async responses validated. Sovereign Adequate marks recorded.",
    });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Top Header & Dual Mode Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link to="/kanban">
            <Button variant="ghost" size="icon" className="size-8">
              <IconArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Screen 3: Code-Defend Viva
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Candidate architectural defense with AI advisory scoring and sovereign recruiter grading.
            </p>
          </div>
        </div>

        {/* Header Actions: Mode Switcher & Direct Proceed */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-muted/40 p-1">
            <Button
              size="sm"
              variant={vivaDisplayMode === "live" ? "default" : "ghost"}
              className="h-7 text-xs font-medium gap-1.5"
              onClick={() => setVivaDisplayMode("live")}
            >
              <IconMicrophone className="size-3.5" />
              Live Voice (Demo)
            </Button>
            <Button
              size="sm"
              variant={vivaDisplayMode === "async" ? "default" : "ghost"}
              className="h-7 text-xs font-medium gap-1.5"
              onClick={() => setVivaDisplayMode("async")}
            >
              <IconWaveSine className="size-3.5" />
              Async Review (Scale Path)
            </Button>
          </div>

          <Link to="/seal">
            <Button size="sm" className="h-8 text-xs font-semibold gap-1.5 shadow-xs">
              Proceed to Authorship Seal
              <IconArrowRight className="size-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Knowledge Reuse: Delta Viva Banner */}
      {preVerifiedCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-xs text-foreground">
          <div className="flex items-center gap-2">
            <span className="flex size-2 rounded-full bg-blue-500 shrink-0 animate-pulse" />
            <span>
              <strong className="text-blue-600 dark:text-blue-400">Delta Viva Active: </strong>
              {preVerifiedCount} technical tickets pre-verified under <code className="font-mono">{priorVerificationId || "TF-VERIFY-20261012-8821"}</code>. Only newly tested deliverables are subject to oral defense; past defense scores carry forward.
            </span>
          </div>
          <Badge variant="outline" className="border-blue-500/40 text-blue-600 dark:text-blue-400 font-mono text-[10px] shrink-0 self-start sm:self-auto">
            Prior Provenance Linked
          </Badge>
        </div>
      )}

      {/* Fairness & Sovereign Recruiter Banner */}
      <div className="rounded-lg border border-border/80 bg-muted/20 px-4 py-2.5 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <IconShieldCheck className="size-4 text-primary shrink-0" />
          <span>
            <strong className="text-foreground">Fairness Disclosure: </strong>
            Speech-to-text accuracy may vary across accents. Recruiter final mark is authoritative; AI score is advisory only. Typed fallback is supported.
          </span>
        </div>
      </div>

      {/* Question Stepper Indicator (Live Voice Mode Only, Clean Monochrome) */}
      {vivaDisplayMode === "live" && totalQuestions > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3.5 py-2">
          <span className="text-xs text-muted-foreground font-mono">
            Defense Progress: {answeredCount}/{totalQuestions} Answered
          </span>
          <div className="flex gap-1.5">
            {vivaQuestions.map((q, idx) => {
              const isAnswered = !!vivaAnswers[q.id];
              const isCurrent = idx === currentIdx;
              return (
                <button
                  key={q.id}
                  onClick={() => {
                    setCurrentIdx(idx);
                    setLiveTranscript(vivaAnswers[q.id]?.transcript || "");
                    setTypedText(vivaAnswers[q.id]?.transcript || "");
                  }}
                  className={`size-6 rounded flex items-center justify-center text-[11px] font-bold transition-all ${
                    isCurrent
                      ? "bg-foreground text-background shadow-xs ring-2 ring-primary/30"
                      : isAnswered
                      ? "bg-muted-foreground/15 text-foreground border border-border/80 font-medium"
                      : "bg-muted text-muted-foreground/60 border border-border/40 hover:bg-muted/80"
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Voice Privacy Consent Banner */}
      {!vivaConsentGiven && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <IconShieldCheck className="size-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-foreground">
                Audio Processing & Candidate Privacy Disclosure (DPDP Section 8)
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Voice audio is captured and transcribed locally on your device via the browser’s Web Speech API. Only the text transcript is analyzed by the evaluation engine. No raw audio files are stored or transmitted.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsTypedMode(true);
                setVivaConsent(true);
                toast.info("Switched to typed response mode (reduced confidence weight).");
              }}
              className="text-xs"
            >
              <IconKeyboard className="size-3.5 mr-1" />
              Use Typed Fallback
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setVivaConsent(true);
                toast.success("Voice defense consent confirmed.");
              }}
              className="text-xs"
            >
              <IconCheck className="size-3.5 mr-1" />
              Accept & Enable Mic
            </Button>
          </div>
        </div>
      )}

      {/* ASYNC MODE PRODUCTION REVIEW VIEW */}
      {vivaDisplayMode === "async" ? (
        <div className="space-y-6">
          {/* Top Explainer Banner (Calm Neutral Container) */}
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="size-8 rounded-lg bg-muted/60 border border-border/60 flex items-center justify-center shrink-0 mt-0.5">
                <IconWaveSine className="size-4 text-foreground/80" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Production Async Funnel: Candidate Self-Defense Review
                  </h3>
                  <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground border-border/70">
                    Campus Scale (90s / review)
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Shortlisted candidates recorded audio responses asynchronously on their own time. Review waveforms, inspect transcripts, and assign authoritative sovereign marks.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="text-xs font-semibold shrink-0 gap-1.5 h-8 border-border/70 hover:bg-muted/60 shadow-xs"
              onClick={handleBatchApproveAsync}
            >
              <IconCheck className="size-3.5 text-emerald-500" />
              Batch Approve AI Marks
            </Button>
          </div>

          {/* Master-Detail Async Defense Workbench */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column: 3 Question Cards (5 cols on lg) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Candidate Defenses ({ASYNC_QUESTIONS.filter((q) => !!vivaAnswers[q.id]?.recruiter_mark).length}/{ASYNC_QUESTIONS.length} Reviewed)
                </h4>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {Math.round((ASYNC_QUESTIONS.filter((q) => !!vivaAnswers[q.id]?.recruiter_mark).length / ASYNC_QUESTIONS.length) * 100)}% Complete
                </span>
              </div>

              <div className="space-y-2">
                {ASYNC_QUESTIONS.map((turn, idx) => {
                  const record = vivaAnswers[turn.id];
                  const isMarked = !!record?.recruiter_mark;
                  const isAdequate = record?.recruiter_mark === "adequate";
                  const isWeak = record?.recruiter_mark === "weak";
                  const isActive = activeAsyncIdx === idx;

                  return (
                    <div
                      key={turn.id}
                      onClick={() => setActiveAsyncIdx(idx)}
                      className={`rounded-xl border p-3.5 cursor-pointer transition-all ${
                        isActive
                          ? "border-primary/50 bg-primary/5 shadow-xs"
                          : "border-border/70 bg-card hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span
                            className={`size-2 mt-1 rounded-full shrink-0 ${
                              isAdequate
                                ? "bg-emerald-500/80 ring-2 ring-emerald-500/20"
                                : isWeak
                                ? "bg-amber-500/80 ring-2 ring-amber-500/20"
                                : "bg-muted-foreground/30"
                            }`}
                            title={isMarked ? `Marked: ${record.recruiter_mark}` : "Awaiting Review"}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-semibold text-foreground">
                                Question {turn.num}
                              </span>
                              <span className="text-muted-foreground text-xs">•</span>
                              <Badge variant="outline" className="text-[10px] font-mono py-0 h-4 border-border/60">
                                {turn.artifact.split("/").pop()}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground line-clamp-1 mt-1">
                              {turn.title}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[11px] font-mono font-medium text-foreground block">
                            {turn.score}%
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {turn.duration}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Active Review Station (7 cols on lg) */}
            <div className="lg:col-span-7">
              {(() => {
                const activeTurn = ASYNC_QUESTIONS[activeAsyncIdx] || ASYNC_QUESTIONS[0];
                const activeRecord = vivaAnswers[activeTurn.id];
                const activeMark = activeRecord?.recruiter_mark || "adequate";

                return (
                  <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden space-y-4 p-5">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          Defense {activeTurn.num} of 3
                        </Badge>
                        <Badge variant="outline" className="text-[10px] font-mono border-border/60 text-muted-foreground">
                          {activeTurn.artifact}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        Recorded: {activeTurn.recordedAt}
                      </span>
                    </div>

                    {/* Question Text */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Defense Challenge
                      </span>
                      <h3 className="text-sm font-semibold text-foreground leading-snug">
                        {activeTurn.question}
                      </h3>
                    </div>

                    {/* Shadcn Audio Waveform Player */}
                    <ShadcnAudioWaveform
                      key={activeTurn.id}
                      durationSeconds={activeTurn.durationSeconds}
                      durationLabel={activeTurn.duration}
                      recordedAt={activeTurn.recordedAt}
                    />

                    {/* Transcript View */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Verified Candidate Transcript
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          Web Speech Engine
                        </span>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 text-xs text-foreground/90 leading-relaxed font-sans border-l-2 border-l-primary/60">
                        "{activeTurn.transcript}"
                      </div>
                    </div>

                    {/* Recruiter Sovereign Marking Bar */}
                    <div className="pt-3 border-t border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[11px] font-mono text-foreground border-border/70">
                          AI Advisory: {activeTurn.score}/100
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          Recruiter Sovereignty:
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {(["adequate", "weak", "none"] as const).map((grade) => {
                          const isSelected = activeMark === grade;
                          return (
                            <Button
                              key={grade}
                              size="sm"
                              variant={isSelected ? "default" : "outline"}
                              className={`h-7 text-xs capitalize ${
                                isSelected && grade === "adequate"
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                                  : isSelected && grade === "weak"
                                  ? "bg-amber-600 hover:bg-amber-700 text-white border-transparent"
                                  : isSelected && grade === "none"
                                  ? "bg-muted text-foreground border-border"
                                  : "border-border/70 text-muted-foreground hover:text-foreground"
                              }`}
                              onClick={() => handleGradeAsync(activeTurn, grade)}
                            >
                              {grade === "none" ? "Flag" : grade}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Proceed Progression Banner */}
          <div className="rounded-xl border border-border/70 bg-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <IconCheck className="size-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {ASYNC_QUESTIONS.filter((q) => !!vivaAnswers[q.id]?.recruiter_mark).length === ASYNC_QUESTIONS.length
                    ? "Async Defense Reviews Completed (3/3)"
                    : `Async Defense Review Progress (${ASYNC_QUESTIONS.filter((q) => !!vivaAnswers[q.id]?.recruiter_mark).length}/3 Reviewed)`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Recruiter sovereign marks recorded. Proceed to mint the cryptographic Authorship Seal.
                </p>
              </div>
            </div>
            <Link to="/seal">
              <Button
                className="text-xs font-semibold gap-1.5 h-8 shadow-xs"
                disabled={ASYNC_QUESTIONS.filter((q) => !!vivaAnswers[q.id]?.recruiter_mark).length === 0}
              >
                Proceed to Authorship Seal
                <IconArrowRight className="size-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      ) : totalQuestions === 0 ? (
        /* Empty State: Prompt to Generate Viva */
        <Card className="border-dashed border-border p-12 text-center">
          <CardContent className="space-y-4 max-w-md mx-auto">
            <div className="size-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
              <IconMicrophone className="size-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Generate Targeted Architectural Questions
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Gemini Flash will analyze the verified tickets and evidence summary to formulate 3 challenging defense questions with recruiter rubrics.
              </p>
            </div>
            <Button
              onClick={handleGenerateViva}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <IconLoader2 className="size-4 mr-2 animate-spin" />
                  Generating Defense Questions & Rubrics...
                </>
              ) : (
                <>
                  <IconSparkles className="size-4 mr-2" />
                  Generate Viva Questions
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : activeQuestion ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Question & Recording Area */}
          <div className="lg:col-span-7 space-y-6">
            {/* Question Card */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        activeQuestion.question_type === "requirement_mutation"
                          ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
                          : activeQuestion.question_type === "adaptive_followup"
                          ? "border-purple-500/40 text-purple-400 bg-purple-500/10"
                          : "border-primary/40 text-primary bg-primary/10"
                      }`}
                    >
                      {activeQuestion.question_type.replace("_", " ")}
                    </Badge>
                    <span className="text-xs font-mono text-muted-foreground">
                      Question {currentIdx + 1} of {totalQuestions}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-[11px] font-mono">
                    {activeQuestion.referenced_artifact}
                  </Badge>
                </div>
                <CardTitle className="text-base sm:text-lg font-semibold text-foreground mt-2 leading-relaxed">
                  {activeQuestion.question_text}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Voice or Typed Input Area */}
                {!isTypedMode ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-border bg-card/60 p-4 min-h-[140px] flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5 font-medium">
                            <IconWaveSine
                              className={`size-4 ${
                                isRecording ? "text-red-500 animate-pulse" : "text-muted-foreground"
                              }`}
                            />
                            {isRecording ? "Listening to candidate..." : "Candidate Spoken Transcript:"}
                          </span>
                          <button
                            onClick={() => setIsTypedMode(true)}
                            className="text-[11px] text-muted-foreground hover:text-foreground underline"
                          >
                            Switch to typed
                          </button>
                        </div>
                        <p className="text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                          {liveTranscript || (
                            <span className="italic text-muted-foreground">
                              {isRecording
                                ? "Candidate is speaking, real-time transcription appearing here..."
                                : "Press 'Start Recording' when the candidate begins speaking."}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Microphone Action Bar */}
                      <div className="flex items-center justify-between pt-3 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant={isRecording ? "destructive" : "default"}
                            onClick={toggleRecording}
                            className="gap-2 text-xs"
                          >
                            {isRecording ? (
                              <>
                                <IconMicrophoneOff className="size-3.5" />
                                Stop Recording
                              </>
                            ) : (
                              <>
                                <IconMicrophone className="size-3.5" />
                                Start Recording
                              </>
                            )}
                          </Button>
                          {liveTranscript && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setLiveTranscript("")}
                              className="text-xs text-muted-foreground"
                            >
                              Clear
                            </Button>
                          )}
                        </div>

                        {liveTranscript && !activeAnswer && (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={isEvaluating}
                            onClick={handleSubmitDefense}
                            className="gap-1.5 text-xs font-semibold"
                          >
                            {isEvaluating ? (
                              <>
                                <IconLoader2 className="size-3.5 animate-spin" />
                                Evaluating...
                              </>
                            ) : (
                              <>
                                <IconSparkles className="size-3.5 text-primary" />
                                Evaluate Rubrics
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5 font-medium text-amber-400">
                        <IconKeyboard className="size-4" />
                        Typed Fallback Mode (Reduced Confidence Weight)
                      </span>
                      <button
                        onClick={() => setIsTypedMode(false)}
                        className="text-[11px] text-muted-foreground hover:text-foreground underline"
                      >
                        Switch to voice
                      </button>
                    </div>
                    <Textarea
                      value={typedText}
                      onChange={(e) => setTypedText(e.target.value)}
                      placeholder="Paste or type candidate architectural defense here..."
                      className="min-h-[140px] text-xs sm:text-sm font-sans"
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={isEvaluating || !typedText.trim()}
                        onClick={handleSubmitDefense}
                        className="gap-1.5 text-xs font-semibold"
                      >
                        {isEvaluating ? (
                          <>
                            <IconLoader2 className="size-3.5 animate-spin" />
                            Evaluating...
                          </>
                        ) : (
                          <>
                            <IconSparkles className="size-3.5 text-primary" />
                            Evaluate Rubrics
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>

              {/* Evaluation Results Drawer */}
              {activeAnswer && (
                <CardFooter className="flex flex-col items-start gap-3 border-t border-border/60 bg-muted/20 pt-4">
                  <div className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">
                        Depth Score:
                      </span>
                      <Badge
                        variant="outline"
                        className={`font-bold ${
                          activeAnswer.score >= 4
                            ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10"
                            : activeAnswer.score === 3
                            ? "text-amber-400 border-amber-500/40 bg-amber-500/10"
                            : "text-red-400 border-red-500/40 bg-red-500/10"
                        }`}
                      >
                        {activeAnswer.score} / 5
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Suggested: <span className="font-semibold uppercase">{activeAnswer.suggested_mark}</span>
                      </span>
                    </div>

                    {/* Recruiter Mark Confirmation */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground mr-1">Recruiter Mark:</span>
                      {(["adequate", "weak", "none"] as const).map((mark) => (
                        <Button
                          key={mark}
                          size="sm"
                          variant={recruiterMark === mark ? "default" : "outline"}
                          onClick={() => handleUpdateMark(mark)}
                          className={`h-7 px-2.5 text-[11px] capitalize ${
                            recruiterMark === mark
                              ? mark === "adequate"
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : mark === "weak"
                                ? "bg-amber-600 hover:bg-amber-700 text-white"
                                : "bg-red-600 hover:bg-red-700 text-white"
                              : ""
                          }`}
                        >
                          {mark}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground italic leading-relaxed">
                    "{activeAnswer.rationale}"
                  </p>

                  {/* Next Question Navigation */}
                  <div className="w-full flex justify-end pt-2 border-t border-border/40">
                    {currentIdx < totalQuestions - 1 ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          const nextIdx = currentIdx + 1;
                          setCurrentIdx(nextIdx);
                          const nextQ = vivaQuestions[nextIdx];
                          setLiveTranscript(vivaAnswers[nextQ?.id]?.transcript || "");
                          setTypedText(vivaAnswers[nextQ?.id]?.transcript || "");
                        }}
                        className="gap-1.5 text-xs"
                      >
                        Next Question
                        <IconArrowRight className="size-3.5" />
                      </Button>
                    ) : (
                      <Link to="/seal">
                        <Button size="sm" className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                          Proceed to Verification Record
                          <IconArrowRight className="size-3.5" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardFooter>
              )}
            </Card>
          </div>

          {/* Recruiter Rubric Sidebar */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <IconFileText className="size-4 text-primary" />
                    Recruiter Evaluation Rubric
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px]">
                    {activeQuestion.rubric.length} Criteria
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Key technical signals a qualified engineer must articulate.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeQuestion.rubric.map((item) => {
                  const check = activeAnswer?.rubric_coverage?.find(
                    (c) => c.rubric_id === item.id
                  );
                  const isEvaluated = !!check;
                  const isHit = check?.hit;

                  return (
                    <div
                      key={item.id}
                      className={`rounded-md border p-3 text-xs space-y-1.5 transition-all ${
                        isEvaluated
                          ? isHit
                            ? "border-emerald-500/40 bg-emerald-500/5 text-foreground"
                            : "border-red-500/40 bg-red-500/5 text-muted-foreground"
                          : "border-border bg-card text-foreground"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-foreground/90">
                          {item.text}
                        </span>
                        {isEvaluated && (
                          <Badge
                            variant="outline"
                            className={`text-[9px] shrink-0 ${
                              isHit
                                ? "border-emerald-500 text-emerald-400"
                                : "border-red-500 text-red-400"
                            }`}
                          >
                            {isHit ? "HIT" : "MISSED"}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        <span className="font-medium text-foreground/70">Signal: </span>
                        {item.expected_signal}
                      </p>
                      {check?.citation && (
                        <p className="text-[11px] italic text-muted-foreground border-l-2 border-primary/40 pl-2 mt-1">
                          "{check.citation}"
                        </p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Dynamic Follow-Up Preview */}
            {activeAnswer?.dynamic_follow_up && (
              <Card className="border-purple-500/40 bg-purple-500/5">
                <CardHeader className="pb-2">
                  <Badge variant="outline" className="w-fit text-[10px] text-purple-400 border-purple-500/40 bg-purple-500/10">
                    Next Adaptive Challenge
                  </Badge>
                  <CardTitle className="text-xs font-semibold text-foreground mt-1">
                    Dynamic Follow-up Ready
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground italic">
                    "{activeAnswer.dynamic_follow_up.question_text}"
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
