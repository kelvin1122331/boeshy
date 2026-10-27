"use client";
import { useState, useEffect, useEffectEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, useAPI } from "@/hooks/use-api";
import { Alert, Icon, Empty, Spinner, PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
type Question = {
  id: string;
  prompt: string;
  topic: string;
  options: string[];
  position: number;
};
type Exam = {
  id: string;
  title: string;
  mode: string;
  durationMinutes: number | null;
  questions: Question[];
  attempts: {
    id: string;
    startedAt: string;
    submittedAt: string | null;
    score: number | null;
  }[];
};
type Attempt = {
  id: string;
  startedAt: string;
  submittedAt: string | null;
  answers: Record<string, number>;
  score: number | null;
  result?: {
    total: number;
    correct: number;
    incorrect: number;
    unanswered: number;
    score: number;
    topics: Record<string, { correct: number; total: number }>;
  };
  review?: (Question & {
    selectedIndex: number | null;
    correctIndex: number;
    explanation: string;
    source: string | null;
  })[];
  recommendations?: string[];
};
export function ExamPlayer({
  examId,
  results = false,
}: {
  examId: string;
  results?: boolean;
}) {
  const {
    data: exam,
    error: loadError,
    loading,
    reload,
  } = useAPI<Exam>(`exams/${examId}`);
  const params = useSearchParams(),
    router = useRouter();
  const [chosenAttemptId, setAttemptId] = useState(params.get("attempt") || ""),
    [attempt, setAttempt] = useState<Attempt | null>(null),
    [index, setIndex] = useState(0),
    [answers, setAnswers] = useState<Record<string, number>>({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [remaining, setRemaining] = useState<number | null>(null),
    [feedback, setFeedback] = useState<{
      correctIndex: number;
      explanation: string;
    } | null>(null);
  const attemptId =
    chosenAttemptId ||
    exam?.attempts.find((a) => (results ? !!a.submittedAt : !a.submittedAt))
      ?.id ||
    "";
  useEffect(() => {
    if (attemptId)
      api<Attempt>(`exams/${examId}/attempts/${attemptId}`)
        .then((a) => {
          setAttempt(a);
          setAnswers(a.answers);
          if (a.submittedAt && !results)
            router.replace(`/study-exam/${examId}/results?attempt=${a.id}`);
        })
        .catch((e) => setError(e.message));
  }, [attemptId, examId, results, router]);
  const onTick = useEffectEvent(() => {
    if (!attempt || !exam?.durationMinutes || attempt.submittedAt) return;
    const seconds = Math.max(
      0,
      Math.ceil(
        (new Date(attempt.startedAt).getTime() +
          exam.durationMinutes * 60000 -
          Date.now()) /
          1000,
      ),
    );
    setRemaining(seconds);
    if (seconds === 0 && !busy) void submit();
  });
  useEffect(() => {
    const timer = setInterval(onTick, 1000);
    return () => clearInterval(timer);
  }, []);
  async function submit() {
    if (!attemptId || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<Attempt>(
        `exams/${examId}/attempts/${attemptId}`,
        { method: "POST", body: "{}" },
      );
      setAttempt(result);
      router.push(`/study-exam/${examId}/results?attempt=${attemptId}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Spinner />;
  if (loadError || !exam)
    return <Alert error>{loadError || "Ujian tidak ditemukan."}</Alert>;
  async function start() {
    setBusy(true);
    try {
      const a = await api<{ id: string }>(`exams/${examId}/attempts`, {
        method: "POST",
        body: "{}",
      });
      setAttemptId(a.id);
      router.replace(`/study-exam/${examId}?attempt=${a.id}`);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const question = exam.questions[index];
  if (results && attempt?.result)
    return (
      <div className="exam-layout">
        <PageHeader
          eyebrow="Study with AI"
          title="Setiap latihan adalah kemajuan."
          description={exam.title}
        >
          <Link className="btn btn-secondary" href="/study-exam">
            Buat ujian baru
          </Link>
        </PageHeader>
        <section className="panel results-hero">
          <span className="eyebrow">HASIL UJIANMU</span>
          <div className="results-score">
            {attempt.result.score}
            <span>/100</span>
          </div>
          <div className="results-stats">
            {[
              { n: attempt.result.correct, label: "Benar" },
              { n: attempt.result.incorrect, label: "Salah" },
              { n: attempt.result.unanswered, label: "Belum dijawab" },
              {
                n: Math.round(
                  (new Date(attempt.submittedAt!).getTime() -
                    new Date(attempt.startedAt).getTime()) /
                    60000,
                ),
                label: "Menit pengerjaan",
              },
            ].map((s) => (
              <div key={s.label}>
                <b>{s.n}</b>
                <small>{s.label}</small>
              </div>
            ))}
          </div>
          <div className="flex-between" style={{ justifyContent: "center" }}>
            <Button
              variant="secondary"
              onClick={() => {
                setAttempt(null);
                setAttemptId("");
                router.push(`/study-exam/${examId}`);
              }}
            >
              Latihan ulang
            </Button>
            <Button
              onClick={async () => {
                try {
                  const r = await api<{ id: string }>(`exams/${examId}/retry`, {
                    method: "POST",
                    body: JSON.stringify({ attemptId }),
                  });
                  router.push(`/study-exam/${r.id}`);
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Ulangi soal yang salah
            </Button>
          </div>
        </section>
        {error && <Alert error>{error}</Alert>}
        <section className="panel" style={{ marginTop: 20 }}>
          <h2>Peta pemahamanmu</h2>
          {Object.entries(attempt.result.topics).map(([topic, t]) => (
            <div key={topic} style={{ marginTop: 18 }}>
              <div className="flex-between">
                <b style={{ fontSize: 12 }}>{topic}</b>
                <small>
                  {t.correct}/{t.total} benar
                </small>
              </div>
              <div
                className="progress-track"
                style={{ marginTop: 8, marginBottom: 8 }}
              >
                <span style={{ width: `${(t.correct / t.total) * 100}%` }} />
              </div>
            </div>
          ))}
          <ul>
            {attempt.recommendations?.map((r) => (
              <li key={r} style={{ fontSize: 12, color: "var(--muted)" }}>
                {r}
              </li>
            ))}
          </ul>
        </section>
        <h2 style={{ marginTop: 30 }}>Tinjau jawabanmu</h2>
        {attempt.review?.map((q, i) => (
          <section
            className={`panel review-question ${q.selectedIndex === q.correctIndex ? "review-correct" : "review-wrong"}`}
            key={q.id}
          >
            <span className="badge">
              {i + 1} · {q.topic} ·{" "}
              {q.selectedIndex === q.correctIndex
                ? "Benar"
                : q.selectedIndex === null
                  ? "Belum dijawab"
                  : "Perlu dipelajari"}
            </span>
            <h3>{q.prompt}</h3>
            <div className="review-answer">
              Jawabanmu:{" "}
              {q.selectedIndex === null
                ? "Tidak dijawab"
                : `${"ABCDE"[q.selectedIndex]}. ${q.options[q.selectedIndex]}`}
            </div>
            <div className="review-answer">
              Jawaban benar: {"ABCDE"[q.correctIndex]}.{" "}
              {q.options[q.correctIndex]}
            </div>
            <p>{q.explanation}</p>
            {q.selectedIndex !== q.correctIndex && (
              <p>
                Pilihanmu belum sesuai dengan konsep yang dijelaskan di atas.
                Tinjau materi topik {q.topic} sebelum mencoba lagi.
              </p>
            )}
            {q.source && <small>Sumber: {q.source}</small>}
          </section>
        ))}
      </div>
    );
  if (!attemptId)
    return (
      <div className="exam-layout">
        <PageHeader
          eyebrow="Study with AI"
          title={exam.title}
          description={`${exam.questions.length} soal · ${exam.mode === "exam" ? "Mode Exam" : "Mode Practice"} · ${exam.durationMinutes ? exam.durationMinutes + " menit" : "Tanpa timer"}`}
        />
        <div className="panel">
          <Empty
            icon="Brain"
            title="Siap mengukur pemahamanmu?"
            description="Setiap soal memiliki lima pilihan. Jawaban disimpan di server selama latihan."
          >
            <Button onClick={() => void start()} disabled={busy}>
              Mulai ujian <Icon name="ArrowRight" size={16} />
            </Button>
          </Empty>
        </div>
        {error && <Alert error>{error}</Alert>}
      </div>
    );
  if (!attempt) return <Spinner />;
  return (
    <div className="exam-layout">
      <div className="exam-header">
        <div>
          <span className="eyebrow">
            STUDY WITH AI · {exam.mode.toUpperCase()}
          </span>
          <h1>{exam.title}</h1>
        </div>
        <div className="exam-timer">
          <Icon name="Timer" />
          {remaining === null
            ? "Tanpa timer"
            : `${Math.floor(remaining / 60)
                .toString()
                .padStart(
                  2,
                  "0",
                )}:${(remaining % 60).toString().padStart(2, "0")}`}
        </div>
      </div>
      <div className="progress-track">
        <span
          style={{
            width: `${(Object.keys(answers).length / exam.questions.length) * 100}%`,
          }}
        />
      </div>
      {error && <Alert error>{error}</Alert>}
      <div className="exam-content">
        <section className="panel question-panel">
          <div className="flex-between">
            <span className="badge">
              Soal {index + 1} dari {exam.questions.length}
            </span>
            <span className="eyebrow">{question.topic}</span>
          </div>
          <h2>{question.prompt}</h2>
          <fieldset
            disabled={busy || remaining === 0}
            style={{ border: 0, padding: 0, margin: 0 }}
          >
            <legend className="sr-only">Pilih satu jawaban</legend>
            {question.options.map((option, i) => (
              <label
                className={`exam-option ${answers[question.id] === i ? "selected" : ""}`}
                key={i}
              >
                <input
                  type="radio"
                  name={question.id}
                  checked={answers[question.id] === i}
                  onChange={async () => {
                    setBusy(true);
                    setError("");
                    try {
                      const r = await api<{
                        correctIndex?: number;
                        explanation?: string;
                      }>(`exams/${examId}/attempts/${attemptId}`, {
                        method: "PATCH",
                        body: JSON.stringify({
                          questionId: question.id,
                          selectedIndex: i,
                        }),
                      });
                      setAnswers({ ...answers, [question.id]: i });
                      if (r.correctIndex !== undefined)
                        setFeedback({
                          correctIndex: r.correctIndex,
                          explanation: r.explanation || "",
                        });
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
                <span className="option-letter">{"ABCDE"[i]}.</span>
                <span>{option}</span>
              </label>
            ))}
          </fieldset>
          {feedback && (
            <Alert>
              Jawaban terbaik: {"ABCDE"[feedback.correctIndex]}.{" "}
              {feedback.explanation}
            </Alert>
          )}
          <div className="exam-actions">
            <Button
              variant="secondary"
              disabled={index === 0 || busy}
              onClick={() => {
                setIndex(index - 1);
                setFeedback(null);
              }}
            >
              <Icon name="ArrowLeft" size={15} />
              Sebelumnya
            </Button>
            <Button
              disabled={index === exam.questions.length - 1 || busy}
              onClick={() => {
                setIndex(index + 1);
                setFeedback(null);
              }}
            >
              Berikutnya
              <Icon name="ArrowRight" size={15} />
            </Button>
          </div>
        </section>
        <aside className="panel exam-navigator">
          <h3>Navigasi soal</h3>
          <div className="question-grid">
            {exam.questions.map((q, i) => (
              <button
                key={q.id}
                disabled={busy}
                aria-label={`Buka soal ${i + 1}`}
                className={`${answers[q.id] !== undefined ? "answered" : ""} ${i === index ? "selected" : ""}`}
                onClick={() => {
                  setIndex(i);
                  setFeedback(null);
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <p>
            {Object.keys(answers).length} dari {exam.questions.length} soal
            terjawab
          </p>
          <Button disabled={busy} onClick={() => void submit()}>
            Kirim jawaban <Icon name="Check" size={15} />
          </Button>
          <small style={{ display: "block", marginTop: 12, fontSize: 9 }}>
            Setelah dikirim, jawaban tidak dapat diubah.
          </small>
        </aside>
      </div>
    </div>
  );
}
