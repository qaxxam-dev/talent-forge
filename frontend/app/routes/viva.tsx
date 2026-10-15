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

const DEFAULT_VIVA_QUESTIONS: VivaQuestion[] = [
  {
    id: "async-q1",
    question_text: "How did you structure the asynchronous background worker to prevent database connection pool starvation under peak campus traffic?",
    referenced_artifact: "app/core/queue_consumer.py",
    question_type: "architectural",
    estimated_duration_seconds: 55,
    sample_candidate_answer: "In app/core/queue_consumer.py, I used an asynchronous semaphore bounded to 20 concurrent tasks, and implemented an exponential backoff retry. For database transactions, we utilized SQLAlchemy async session contexts with pre_ping=True, ensuring idle connections are reclaimed rather than starving the pool.",
    rubric: [
      { id: "r-1-1", text: "Bounded async concurrency control", expected_signal: "Asyncio semaphore or worker pool limit" },
      { id: "r-1-2", text: "Connection pool reclamation", expected_signal: "Session context management and pre_ping pool health checks" },
    ],
  },
  {
    id: "async-q2",
    question_text: "Why did you choose PostgreSQL advisory locks rather than an in-memory Redis mutex for double-entry ledger transactions?",
    referenced_artifact: "src/ledger/transaction_service.ts",
    question_type: "tradeoff",
    estimated_duration_seconds: 48,
    sample_candidate_answer: "Redis distributed locks introduce network partition failure risks and potential split-brain if the lock TTL expires mid-transaction. By using PostgreSQL advisory locks within the same relational transaction boundary, lock release is strictly tied to the commit/rollback lifecycle, guaranteeing zero unbalanced entries.",
    rubric: [
      { id: "r-2-1", text: "Transactional lifecycle coupling", expected_signal: "Lock release strictly bound to commit or rollback" },
      { id: "r-2-2", text: "Split-brain risk mitigation", expected_signal: "Avoids cache TTL expiration during long database transactions" },
    ],
  },
  {
    id: "async-q3",
    question_text: "If the upstream message queue broker disconnects mid-ingestion, how does your consumer guarantee at-least-once delivery without duplicating state?",
    referenced_artifact: "Dockerfile & queue_worker.py",
    question_type: "requirement_mutation",
    estimated_duration_seconds: 52,
    sample_candidate_answer: "Each ingested payload is assigned a deterministic SHA-256 idempotency key stored in Redis with an atomic SETNX check. If the consumer dies before sending an ACK, the re-delivered message hits the deduplication filter, logs a duplicate warning, and skips re-execution.",
    rubric: [
      { id: "r-3-1", text: "Deterministic idempotency keys", expected_signal: "SHA-256 or payload hash filter" },
      { id: "r-3-2", text: "Atomic duplicate suppression", expected_signal: "SETNX or unique constraint validation" },
    ],
  },
];

interface AudioWaveformProps {
  durationSeconds: number;
  durationLabel: string;
  recordedAt: string;
  textToSpeak?: string;
}

function ShadcnAudioWaveform({
  durationSeconds,
  durationLabel,
  recordedAt,
  textToSpeak,
}: AudioWaveformProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [playbackSpeed, setPlaybackSpeed] = React.useState<1 | 1.5 | 2>(1);

  // Stop speech when unmounting or textToSpeak changes
  React.useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [textToSpeak]);

  const barHeights = React.useMemo(() => [
    18, 22, 28, 36, 45, 52, 65, 78, 85, 92,
    70, 58, 74, 88, 96, 100, 90, 78, 64, 52,
    68, 82, 94, 86, 72, 60, 48, 66, 80, 88,
    76, 62, 50, 42, 55, 70, 84, 75, 60, 48,
    38, 30, 24, 28, 22, 18, 16, 14,
  ], []);

  // Update timer while speaking
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

  const handleTogglePlay = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Web Speech Synthesis not supported in this browser.");
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
    } else {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setIsPlaying(true);
      } else {
        window.speechSynthesis.cancel();
        if (currentTime >= durationSeconds) {
          setCurrentTime(0);
        }
        const text = textToSpeak || "Candidate response is being analyzed by the evaluation engine.";
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = playbackSpeed;
        utterance.onend = () => {
          setIsPlaying(false);
          setCurrentTime(durationSeconds);
        };
        utterance.onerror = (e) => {
          console.warn("Speech synthesis error", e);
          setIsPlaying(false);
        };
        window.speechSynthesis.speak(utterance);
        setIsPlaying(true);
      }
    }
  };

  const handleReset = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const progress = Math.min(1, currentTime / durationSeconds);
  const currentMinutes = Math.floor(currentTime / 60);
  const currentSecs = Math.floor(currentTime % 60);
  const formattedCurrent = `${String(currentMinutes).padStart(2, "0")}:${String(currentSecs).padStart(2, "0")}`;

  const handleBarClick = (index: number) => {
    const targetProgress = index / barHeights.length;
    setCurrentTime(targetProgress * durationSeconds);
  };

  const toggleSpeed = () => {
    const nextSpeed: 1 | 1.5 | 2 = playbackSpeed === 1 ? 1.5 : playbackSpeed === 1.5 ? 2 : 1;
    setPlaybackSpeed(nextSpeed);
    if (isPlaying && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const text = textToSpeak || "";
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = nextSpeed;
      utterance.onend = () => {
        setIsPlaying(false);
        setCurrentTime(durationSeconds);
      };
      window.speechSynthesis.speak(utterance);
    }
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
            onClick={handleTogglePlay}
            title={isPlaying ? "Pause voice synthesis" : "Play candidate voice"}
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
            onClick={handleReset}
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
          : tasks.length > 0
          ? tasks.slice(0, 3).map((t) => `${t.id}: ${t.title} (${t.suggested_path})`)
          : [
              "TF-SPRINT1-01: Order schema and database models (src/models/orders.py)",
              "TF-SPRINT2-01: Checkout controller and idempotency key (src/api/orders.py)",
              "TF-SPRINT3-01: Concurrency isolation test suite (tests/test_orders.py)",
            ];

      const codeSnippets = tasks
        .filter((t) => !!t.verified_code_snippet)
        .map((t) => `// ${t.id} (${t.suggested_path}):\n${t.verified_code_snippet}`);

      const unsubstantiatedClaims = skillGapAnalysis?.critical_gaps?.map((g) => g.name) || [];

      const summary =
        evidenceSummary ||
        `Candidate completed proof-of-work tickets across database models, controllers, and tests with verified code deliverables.`;

      if (!evidenceSummary) {
        setEvidenceSummary(summary);
      }

      const res = await api.generateViva({
        role_title: "Senior Backend Engineer",
        job_description: jobDescription || "Production backend engineer with relational database and concurrency expertise",
        evidence_summary: summary,
        claimed_artifacts: claimedArtifacts,
        unsubstantiated_claims: unsubstantiatedClaims.length > 0 ? unsubstantiatedClaims : undefined,
        code_snippets: codeSnippets.length > 0 ? codeSnippets : undefined,
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

  // Active questions for Async Review: use real vivaQuestions if present, else fallback to DEFAULT_VIVA_QUESTIONS
  const currentQuestions = vivaQuestions.length > 0 ? vivaQuestions : DEFAULT_VIVA_QUESTIONS;

  const asyncTurns = currentQuestions.map((q, idx) => {
    const record = vivaAnswers[q.id];
    const durationSecs = q.estimated_duration_seconds || 52;
    const durMin = Math.floor(durationSecs / 60);
    const durSec = Math.floor(durationSecs % 60);
    const durLabel = `${String(durMin).padStart(2, "0")}:${String(durSec).padStart(2, "0")}`;

    return {
      id: q.id,
      num: idx + 1,
      title:
        q.question_type === "architectural"
          ? "Architecture Deep Dive"
          : q.question_type === "tradeoff"
          ? "Concurrency & Trade-offs"
          : q.question_type === "requirement_mutation"
          ? "Requirement Mutation Test"
          : "Adaptive Follow-up",
      question: q.question_text,
      artifact: q.referenced_artifact,
      duration: durLabel,
      durationSeconds: durationSecs,
      recordedAt: "Self-Recorded Audio Submission",
      transcript:
        record?.transcript ||
        q.sample_candidate_answer ||
        "Candidate defended the architecture, explaining transaction isolation levels and concurrency control.",
      suggestedMark: record?.suggested_mark || "adequate",
      score: record?.score ? record.score * 20 : 88,
      rubric: q.rubric,
    };
  });

  const handleGradeAsync = (turn: (typeof asyncTurns)[0], grade: "adequate" | "weak" | "none") => {
    const mockAns: VivaAnswerRecord = {
      question_id: turn.id,
      transcript: turn.transcript,
      delivery_mode: "voice",
      score: grade === "adequate" ? 4 : grade === "weak" ? 3 : 2,
      suggested_mark: "adequate",
      recruiter_mark: grade,
      rationale: "Recruiter reviewed async candidate voice playback and recorded sovereign mark.",
      rubric_coverage: turn.rubric.map((r, i) => ({
        rubric_id: r.id,
        criterion: r.text,
        hit: grade === "adequate" || (grade === "weak" && i === 0),
        citation: turn.transcript.slice(0, 60),
      })),
    };
    recordVivaAnswer(mockAns);
    toast.success(`Marked Question ${turn.num} as ${grade.toUpperCase()}`);
  };

  const handleBatchApproveAsync = () => {
    if (vivaQuestions.length === 0) {
      setVivaQuestions(currentQuestions);
    }

    currentQuestions.forEach((q, i) => {
      const sampleAnswer =
        vivaAnswers[q.id]?.transcript ||
        q.sample_candidate_answer ||
        "Candidate articulated clear architectural defense.";
      const ansRecord: VivaAnswerRecord = {
        question_id: q.id,
        transcript: sampleAnswer,
        delivery_mode: "voice",
        score: 4 + (i % 2 === 0 ? 1 : 0),
        suggested_mark: "adequate",
        recruiter_mark: "adequate",
        rationale: "Strong technical defense demonstrating hands-on ownership of code artifacts.",
        rubric_coverage: q.rubric.map((r) => ({
          rubric_id: r.id,
          criterion: r.text,
          hit: true,
          citation: sampleAnswer.slice(0, 50),
        })),
      };
      recordVivaAnswer(ansRecord);
    });

    toast.success("Batch Approved Candidate Defenses", {
      description: `All ${currentQuestions.length} responses validated. Sovereign Adequate marks recorded.`,
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

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-semibold shrink-0 gap-1.5 h-8 border-border/70 hover:bg-muted/60 shadow-xs"
                onClick={handleGenerateViva}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <IconLoader2 className="size-3.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <IconSparkles className="size-3.5 text-primary" />
                    Generate Viva From Code
                  </>
                )}
              </Button>

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
          </div>

          {/* Master-Detail Async Defense Workbench */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column: Question Cards (5 cols on lg) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Candidate Defenses ({asyncTurns.filter((q) => !!vivaAnswers[q.id]?.recruiter_mark).length}/{asyncTurns.length} Reviewed)
                </h4>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {Math.round((asyncTurns.filter((q) => !!vivaAnswers[q.id]?.recruiter_mark).length / Math.max(1, asyncTurns.length)) * 100)}% Complete
                </span>
              </div>

              <div className="space-y-2">
                {asyncTurns.map((turn, idx) => {
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
                const activeTurn = asyncTurns[activeAsyncIdx] || asyncTurns[0];
                if (!activeTurn) return null;
                const activeRecord = vivaAnswers[activeTurn.id];
                const activeMark = activeRecord?.recruiter_mark || "adequate";

                return (
                  <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden space-y-4 p-5">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          Defense {activeTurn.num} of {asyncTurns.length}
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

                    {/* Shadcn Audio Waveform Player with real Web Speech Synthesis */}
                    <ShadcnAudioWaveform
                      key={activeTurn.id}
                      durationSeconds={activeTurn.durationSeconds}
                      durationLabel={activeTurn.duration}
                      recordedAt={activeTurn.recordedAt}
                      textToSpeak={activeTurn.transcript}
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
                  {asyncTurns.filter((q) => !!vivaAnswers[q.id]?.recruiter_mark).length === asyncTurns.length
                    ? `Async Defense Reviews Completed (${asyncTurns.length}/${asyncTurns.length})`
                    : `Async Defense Review Progress (${asyncTurns.filter((q) => !!vivaAnswers[q.id]?.recruiter_mark).length}/${asyncTurns.length} Reviewed)`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Recruiter sovereign marks recorded. Proceed to mint the cryptographic Authorship Seal.
                </p>
              </div>
            </div>
            <Link to="/seal">
              <Button
                className="text-xs font-semibold gap-1.5 h-8 shadow-xs"
                disabled={asyncTurns.filter((q) => !!vivaAnswers[q.id]?.recruiter_mark).length === 0}
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
