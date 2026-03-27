"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import StudentProgressCard from "@/components/StudentProgressCard";
import { getCourse, getUserProgress, updateProgress } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function formatDuration(seconds?: number) {
  if (!seconds || seconds <= 0) return "Self-paced";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
}

function formatPosition(seconds?: number) {
  if (!seconds || seconds <= 0) return "0:00";
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatIssuedDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function isVideoLesson(contentType?: string) {
  return (contentType || "").toLowerCase().includes("video");
}

function getLessonUrl(lesson: any) {
  return lesson?.content_url || lesson?.source_url || "";
}

export default function CourseDetailPage({ params }: { params: { id: string } }) {
  const { token, loading: authLoading } = useAuth();
  const [course, setCourse] = useState<any>(null);
  const [progressData, setProgressData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [workspaceMessage, setWorkspaceMessage] = useState<string | null>(null);
  const [workspaceSaving, setWorkspaceSaving] = useState(false);
  const [copiedCertificate, setCopiedCertificate] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const lastSavedRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      setLoading(false);
      return;
    }

    Promise.all([
      getCourse(params.id, token),
      getUserProgress(token)
    ])
      .then(([courseRes, progRes]) => {
        setLoadError(null);
        setCourse(courseRes);
        setProgressData(progRes || []);
        setLoading(false);
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : "Unable to load this course right now.");
        setCourse(null);
        setLoading(false);
      });
  }, [params.id, token, authLoading]);

  if (loading || authLoading) {
    return (
      <main className="min-h-screen px-6 py-10 flex items-center justify-center">
        <p className="text-dune/60">Loading course...</p>
      </main>
    );
  }

  if (!token) {
    return (
      <main className="min-h-screen px-6 py-10 flex items-center justify-center">
        <p className="text-dune/60">Please <Link href="/" className="text-ember underline">log in</Link> to view path.</p>
      </main>
    );
  }

  if (!course) {
    return (
      <main className="min-h-screen px-6 py-10 flex items-center justify-center">
        <div className="max-w-xl rounded-3xl border border-dune/10 bg-midnight/40 p-8 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-ember">Course Access</p>
          <p className="mt-4 text-dune/70">{loadError || "Course not found."}</p>
          <Link href="/pricing" className="mt-6 inline-flex rounded-full border border-dune/20 px-5 py-2 text-sm text-dune hover:border-ember hover:text-ember transition-colors">
            View Plans
          </Link>
        </div>
      </main>
    );
  }

  const modules = [...(course.modules || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const allLessons = modules.flatMap((mod: any, modIndex: number) =>
    [...(mod.lessons || [])]
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((lesson: any) => ({
        id: lesson.id,
        title: `${mod.title} - ${lesson.title}`,
        content_type: lesson.content_type,
        lessonTitle: lesson.title,
        moduleTitle: mod.title,
        moduleIndex: modIndex + 1,
        source_url: lesson.source_url,
        content_url: lesson.content_url,
        duration_seconds: lesson.duration_seconds,
        status: lesson.status,
        metadata: lesson.metadata || {},
      })),
  );
  const selectedLesson = useMemo(
    () => allLessons.find((lesson) => lesson.id === selectedLessonId) || allLessons[0] || null,
    [allLessons, selectedLessonId],
  );
  const selectedLessonProgress = useMemo(
    () => progressData.find((entry) => entry.lesson_id === selectedLesson?.id),
    [progressData, selectedLesson?.id],
  );
  const recommendedLesson = useMemo(
    () =>
      allLessons.find((lesson) => {
        const progress = progressData.find((entry) => entry.lesson_id === lesson.id);
        return (progress?.progress_percent || 0) < 100;
      }) || allLessons[0] || null,
    [allLessons, progressData],
  );
  const recommendedLessonProgress = useMemo(
    () => progressData.find((entry) => entry.lesson_id === recommendedLesson?.id),
    [progressData, recommendedLesson?.id],
  );
  const selectedLessonIndex = useMemo(
    () => allLessons.findIndex((lesson) => lesson.id === selectedLesson?.id),
    [allLessons, selectedLesson?.id],
  );
  const nextLesson = selectedLessonIndex >= 0 ? allLessons[selectedLessonIndex + 1] || null : null;
  const courseProgress = useMemo(() => {
    if (allLessons.length === 0) return 0;
    const total = allLessons.reduce((sum, lesson) => {
      const lessonProgress = progressData.find((entry) => entry.lesson_id === lesson.id);
      return sum + (lessonProgress?.progress_percent || 0);
    }, 0);
    return Math.round(total / allLessons.length);
  }, [allLessons, progressData]);
  const completedLessons = useMemo(
    () => allLessons.filter((lesson) => (progressData.find((entry) => entry.lesson_id === lesson.id)?.progress_percent || 0) >= 100).length,
    [allLessons, progressData],
  );
  const remainingLessons = Math.max(0, allLessons.length - completedLessons);
  const isCourseComplete = allLessons.length > 0 && completedLessons === allLessons.length;
  const lessonUrl = getLessonUrl(selectedLesson);
  const courseAward = course?.award || null;

  const persistLessonProgress = async (
    lessonId: string,
    progressPercent: number,
    lastPositionSeconds?: number,
    options?: { silent?: boolean; successMessage?: string },
  ) => {
    if (!token || !lessonId) return;
    const normalizedPercent = Math.min(100, Math.max(0, Math.round(progressPercent)));
    const normalizedPosition = Math.max(0, Math.round(lastPositionSeconds || 0));
    if (!options?.silent) {
      setWorkspaceSaving(true);
    }
    try {
      const updateResult = await updateProgress(
        {
          lesson_id: lessonId,
          progress_percent: normalizedPercent,
          last_position_seconds: normalizedPosition,
        },
        token,
      );
      if (updateResult?.award) {
        setCourse((current: any) => (current ? { ...current, award: updateResult.award } : current));
      }
      lastSavedRef.current[lessonId] = normalizedPosition;
      const newProg = await getUserProgress(token);
      setProgressData(newProg || []);
      if (options?.successMessage) {
        setWorkspaceMessage(options.successMessage);
      }
    } catch (error) {
      if (!options?.silent) {
        setWorkspaceMessage(error instanceof Error ? error.message : "Unable to save lesson progress right now.");
      }
    } finally {
      if (!options?.silent) {
        setWorkspaceSaving(false);
      }
    }
  };

  useEffect(() => {
    if (!allLessons.length) {
      setSelectedLessonId("");
      return;
    }
    setSelectedLessonId((current) => {
      if (current && allLessons.some((lesson) => lesson.id === current)) {
        return current;
      }
      const nextIncomplete = allLessons.find((lesson) => {
        const progress = progressData.find((entry) => entry.lesson_id === lesson.id);
        return (progress?.progress_percent || 0) < 100;
      });
      return nextIncomplete?.id || allLessons[0].id;
    });
  }, [allLessons, progressData]);

  useEffect(() => {
    setWorkspaceMessage(null);
  }, [selectedLesson?.id]);

  useEffect(() => {
    if (!copiedCertificate) return;
    const timeout = window.setTimeout(() => setCopiedCertificate(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [copiedCertificate]);

  useEffect(() => {
    if (!selectedLesson || !isVideoLesson(selectedLesson.content_type) || !videoRef.current) return;
    const targetPosition = selectedLessonProgress?.last_position_seconds || 0;
    if (!targetPosition) return;

    const video = videoRef.current;
    const restorePosition = () => {
      if (targetPosition > 0 && Number.isFinite(video.duration || 0)) {
        video.currentTime = Math.min(targetPosition, Math.max(0, (video.duration || targetPosition) - 1));
      }
    };

    if (video.readyState >= 1) {
      restorePosition();
      return;
    }

    video.addEventListener("loadedmetadata", restorePosition, { once: true });
    return () => {
      video.removeEventListener("loadedmetadata", restorePosition);
    };
  }, [selectedLesson?.id, selectedLesson?.content_type, selectedLessonProgress?.last_position_seconds]);

  useEffect(() => {
    const currentLesson = selectedLesson;
    const video = videoRef.current;
    if (!currentLesson || !video || !isVideoLesson(currentLesson.content_type)) return;

    const queueSave = () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = window.setTimeout(() => {
        const currentTime = Math.floor(video.currentTime || 0);
        if (lastSavedRef.current[currentLesson.id] === currentTime) {
          return;
        }
        const percent = video.duration > 0 ? (video.currentTime / video.duration) * 100 : selectedLessonProgress?.progress_percent || 0;
        persistLessonProgress(currentLesson.id, percent, currentTime, { silent: true });
      }, 1200);
    };

    const saveOnPause = () => {
      const currentTime = Math.floor(video.currentTime || 0);
      const percent = video.duration > 0 ? (video.currentTime / video.duration) * 100 : selectedLessonProgress?.progress_percent || 0;
      persistLessonProgress(currentLesson.id, percent, currentTime, { silent: true });
    };

    const completeOnEnd = () => {
      persistLessonProgress(currentLesson.id, 100, Math.floor(video.duration || video.currentTime || 0), {
        silent: true,
        successMessage: "Lesson completed. Ready for the next one.",
      });
    };

    video.addEventListener("timeupdate", queueSave);
    video.addEventListener("pause", saveOnPause);
    video.addEventListener("ended", completeOnEnd);

    return () => {
      video.removeEventListener("timeupdate", queueSave);
      video.removeEventListener("pause", saveOnPause);
      video.removeEventListener("ended", completeOnEnd);
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [selectedLesson, selectedLessonProgress?.progress_percent, token]);

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-ember">Course Detail</p>
            <h1 className="font-[var(--font-space)] text-3xl">{course.title}</h1>
            {course.description && <p className="mt-2 text-dune/80">{course.description}</p>}
            {courseAward ? (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100">
                <span>{courseAward.badge_label}</span>
                <span className="text-emerald-100/70">Certificate {courseAward.certificate_code}</span>
              </div>
            ) : null}
          </div>
          <Link href="/" className="rounded-full border border-dune/30 px-5 py-2 text-sm">
            Back to Library
          </Link>
        </header>

        <section className="glass rounded-2xl p-8">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <h2 className="font-[var(--font-space)] text-2xl">Immersive Module Roadmap</h2>
              <p className="mt-3 text-sm text-dune/80">
                Explore the full module sequence, open lessons directly in the workspace, and track your progress as
                you move through the course.
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-dune/10 bg-midnight/50 p-4">
                  <p className="text-[10px] uppercase tracking-widest text-dune/50">Course Progress</p>
                  <p className="mt-3 text-3xl font-[var(--font-space)] text-ember">{courseProgress}%</p>
                </div>
                <div className="rounded-2xl border border-dune/10 bg-midnight/50 p-4">
                  <p className="text-[10px] uppercase tracking-widest text-dune/50">Completed Lessons</p>
                  <p className="mt-3 text-3xl font-[var(--font-space)] text-ember">{completedLessons}</p>
                </div>
                <div className="rounded-2xl border border-dune/10 bg-midnight/50 p-4">
                  <p className="text-[10px] uppercase tracking-widest text-dune/50">Remaining Lessons</p>
                  <p className="mt-3 text-3xl font-[var(--font-space)] text-ember">{remainingLessons}</p>
                </div>
              </div>

              {isCourseComplete ? (
                <div className="mt-6 rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-6">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-300">Course Complete</p>
                  <h3 className="mt-3 font-[var(--font-space)] text-2xl text-dune">You finished every lesson in this path.</h3>
                  <p className="mt-3 text-sm leading-relaxed text-dune/75">
                    Your progress is fully recorded. Review key lessons anytime, revisit saved notes and AI summaries,
                    or head back to the library to start another path.
                  </p>
                  {courseAward ? (
                    <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-midnight/30 p-4">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-200/80">Certificate Awarded</p>
                      <p className="mt-2 text-sm text-dune/80">
                        {courseAward.badge_label} issued on {formatIssuedDate(courseAward.issued_at)}.
                      </p>
                      <p className="mt-2 text-sm text-emerald-100">Certificate code: {courseAward.certificate_code}</p>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-dune/65">
                      Your completion badge and certificate will appear here as soon as the final lesson sync finishes.
                    </p>
                  )}
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (allLessons[0]) {
                          setSelectedLessonId(allLessons[0].id);
                        }
                      }}
                      className="rounded-full bg-emerald-300 px-4 py-2 text-sm font-semibold text-midnight hover:opacity-90"
                    >
                      Review from lesson 1
                    </button>
                    <Link
                      href="/"
                      className="rounded-full border border-dune/20 px-4 py-2 text-sm font-semibold text-dune/80 hover:border-dune/40"
                    >
                      Explore more content
                    </Link>
                    {courseAward ? (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(courseAward.certificate_code);
                            setCopiedCertificate(true);
                          } catch {
                            setCopiedCertificate(false);
                          }
                        }}
                        className="rounded-full border border-emerald-300/30 px-4 py-2 text-sm font-semibold text-emerald-100 hover:border-emerald-200"
                      >
                        {copiedCertificate ? "Copied" : "Copy certificate code"}
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : recommendedLesson ? (
                <div className="mt-6 rounded-3xl border border-ember/20 bg-ember/5 p-6">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-ember">Continue Learning</p>
                  <h3 className="mt-3 font-[var(--font-space)] text-2xl text-dune">{recommendedLesson.lessonTitle}</h3>
                  <p className="mt-2 text-sm text-dune/70">
                    Module {recommendedLesson.moduleIndex} • {recommendedLesson.moduleTitle}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-widest text-dune/50">
                    <span className="rounded-full border border-dune/15 px-3 py-1">{recommendedLesson.content_type}</span>
                    <span className="rounded-full border border-dune/15 px-3 py-1">
                      {Math.round(recommendedLessonProgress?.progress_percent || 0)}% complete
                    </span>
                    {recommendedLessonProgress?.last_position_seconds ? (
                      <span className="rounded-full border border-ember/20 px-3 py-1 text-ember">
                        Resume at {formatPosition(recommendedLessonProgress.last_position_seconds)}
                      </span>
                    ) : (
                      <span className="rounded-full border border-dune/15 px-3 py-1">Ready to start</span>
                    )}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedLessonId(recommendedLesson.id)}
                      className="rounded-full bg-ember px-4 py-2 text-sm font-semibold text-midnight hover:opacity-90"
                    >
                      Continue lesson
                    </button>
                    {nextLesson && selectedLesson?.id === recommendedLesson.id ? (
                      <button
                        type="button"
                        onClick={() => setSelectedLessonId(nextLesson.id)}
                        className="rounded-full border border-dune/20 px-4 py-2 text-sm font-semibold text-dune/80 hover:border-dune/40"
                      >
                        Skip to next lesson
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="mt-6 space-y-6">
                {modules.map((mod: any, index: number) => {
                  const lessons = [...(mod.lessons || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
                  return (
                    <div key={mod.id} className="rounded-2xl bg-midnight/60 p-5 border border-dune/10">
                      <p className="text-sm uppercase font-semibold text-dune/60 tracking-wider">Module {index + 1}</p>
                      <h3 className="text-lg font-[var(--font-space)] mt-1">{mod.title}</h3>
                      <div className="mt-4 space-y-3">
                        {lessons.map((lesson: any) => {
                          const pData = progressData.find((p) => p.lesson_id === lesson.id);
                          const progressPercent = pData ? pData.progress_percent : 0;
                          const metadata = lesson.metadata || {};
                          const hasAI = !!metadata.summary || !!metadata.key_points || !!metadata.flashcards;
                          const isSelected = selectedLesson?.id === lesson.id;

                          return (
                            <div
                              key={lesson.id}
                              className={`flex flex-col rounded-xl p-4 border transition-colors ${
                                isSelected ? "border-ember/40 bg-ember/5" : "border-dune/10 bg-midnight"
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex-1">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedLessonId(lesson.id)}
                                    className="text-left text-sm font-semibold text-dune hover:text-ember transition-colors"
                                  >
                                    {lesson.title}
                                  </button>
                                  <div className="mt-2 h-1.5 w-full rounded-full bg-dune/10">
                                    <div className="h-1.5 rounded-full bg-ember transition-all" style={{ width: `${progressPercent}%` }} />
                                  </div>
                                </div>
                                <div className="ml-4 text-right">
                                  <span className="text-xs text-dune/40 uppercase">
                                    {lesson.content_type} <br /> {Math.round(progressPercent)}%
                                  </span>
                                  <div className="mt-2 flex flex-wrap justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedLessonId(lesson.id)}
                                      className="rounded border border-dune/20 px-2 py-0.5 text-[10px] text-dune/70 hover:border-dune/40"
                                    >
                                      Open
                                    </button>
                                    {progressPercent < 100 && (
                                    <button
                                      onClick={() =>
                                        persistLessonProgress(lesson.id, 100, pData?.last_position_seconds || 0, {
                                          successMessage: "Lesson completed. Nice work.",
                                        })
                                      }
                                      className="block mt-2 rounded border border-ember/50 px-2 py-0.5 text-[10px] text-ember hover:bg-ember hover:text-midnight transition"
                                    >
                                      Mark Complete
                                    </button>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {hasAI && (
                                <div className="mt-4 border-t border-dune/10 pt-4 space-y-4">
                                  {metadata.summary && (
                                    <div>
                                      <p className="text-[10px] font-bold uppercase tracking-widest text-ember">AI Summary</p>
                                      <p className="mt-1 text-sm text-dune/80 leading-relaxed">{metadata.summary}</p>
                                    </div>
                                  )}
                                  {metadata.key_points && Array.isArray(metadata.key_points) && metadata.key_points.length > 0 && (
                                    <div>
                                      <p className="text-[10px] font-bold uppercase tracking-widest text-ember">Key Points</p>
                                      <ul className="mt-1 list-disc pl-5 text-sm text-dune/80 space-y-1">
                                        {metadata.key_points.map((pt: string, i: number) => <li key={i}>{pt}</li>)}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {lessons.length === 0 && <p className="text-xs text-dune/40">No lessons yet.</p>}
                      </div>
                    </div>
                  );
                })}
                {modules.length === 0 && <p className="text-sm text-dune/60">No modules available for this course.</p>}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              {recommendedLesson && !isCourseComplete ? (
                <div className="rounded-2xl bg-midnight/60 p-6 border border-dune/10">
                  <p className="text-xs uppercase tracking-[0.3em] text-ember">Next Recommended</p>
                  <h3 className="mt-3 font-[var(--font-space)] text-xl">{recommendedLesson.lessonTitle}</h3>
                  <p className="mt-2 text-sm text-dune/65">
                    {recommendedLesson.moduleTitle} • {formatDuration(recommendedLesson.duration_seconds)}
                  </p>
                  <div className="mt-4 h-2 rounded-full bg-dune/10">
                    <div
                      className="h-2 rounded-full bg-ember transition-all"
                      style={{ width: `${Math.round(recommendedLessonProgress?.progress_percent || 0)}%` }}
                    />
                  </div>
                  <p className="mt-3 text-sm text-dune/70">
                    {recommendedLessonProgress?.last_position_seconds
                      ? `Resume from ${formatPosition(recommendedLessonProgress.last_position_seconds)}.`
                      : "Start this lesson to keep your course momentum going."}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedLessonId(recommendedLesson.id)}
                    className="mt-4 rounded-full border border-ember/40 px-4 py-2 text-sm font-semibold text-ember hover:bg-ember hover:text-midnight transition"
                  >
                    Open recommended lesson
                  </button>
                </div>
              ) : null}

                <div className="rounded-2xl bg-midnight/60 p-6 border border-dune/10">
                <p className="text-xs uppercase tracking-[0.3em] text-ember">Lesson Workspace</p>
                {!selectedLesson ? (
                  <p className="mt-4 text-sm text-dune/60">Select a lesson to start learning.</p>
                ) : (
                  <div className="mt-4 space-y-5">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-dune/45">
                        Module {selectedLesson.moduleIndex} • {selectedLesson.moduleTitle}
                      </p>
                      <h3 className="mt-2 font-[var(--font-space)] text-2xl">{selectedLesson.lessonTitle}</h3>
                      <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-widest text-dune/50">
                        <span className="rounded-full border border-dune/15 px-3 py-1">{selectedLesson.content_type}</span>
                        <span className="rounded-full border border-dune/15 px-3 py-1">{formatDuration(selectedLesson.duration_seconds)}</span>
                        <span className="rounded-full border border-dune/15 px-3 py-1">
                          {Math.round(selectedLessonProgress?.progress_percent || 0)}% complete
                        </span>
                        {selectedLessonProgress?.last_position_seconds ? (
                          <span className="rounded-full border border-ember/20 px-3 py-1 text-ember">
                            Resume at {formatPosition(selectedLessonProgress.last_position_seconds)}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {workspaceMessage ? (
                      <div className="rounded-2xl border border-ember/20 bg-ember/5 px-4 py-3 text-sm text-dune/80">
                        {workspaceMessage}
                      </div>
                    ) : null}

                    {lessonUrl ? (
                      <div className="space-y-4">
                        {isVideoLesson(selectedLesson.content_type) ? (
                          <video
                            key={selectedLesson.id}
                            ref={videoRef}
                            controls
                            preload="metadata"
                            className="w-full rounded-2xl border border-dune/10 bg-black/40"
                            src={lessonUrl}
                          >
                            Your browser does not support embedded video playback.
                          </video>
                        ) : (
                          <div className="rounded-2xl border border-dune/10 bg-midnight/40">
                            <iframe
                              key={selectedLesson.id}
                              src={lessonUrl}
                              title={selectedLesson.lessonTitle}
                              className="h-[420px] w-full rounded-2xl"
                            />
                          </div>
                        )}

                        <div className="flex flex-wrap gap-3">
                          <a
                            href={lessonUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full bg-ember px-4 py-2 text-sm font-semibold text-midnight hover:opacity-90"
                          >
                            Open source
                          </a>
                          <button
                            type="button"
                            onClick={() =>
                              persistLessonProgress(selectedLesson.id, 100, selectedLessonProgress?.last_position_seconds || 0, {
                                successMessage: "Lesson completed. Nice work.",
                              })
                            }
                            className="rounded-full border border-ember/40 px-4 py-2 text-sm font-semibold text-ember hover:bg-ember hover:text-midnight transition"
                          >
                            Mark lesson complete
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              persistLessonProgress(
                                selectedLesson.id,
                                Math.max(5, selectedLessonProgress?.progress_percent || 0),
                                selectedLessonProgress?.last_position_seconds || 0,
                                { successMessage: "Lesson progress saved." },
                              )
                            }
                            disabled={workspaceSaving}
                            className="rounded-full border border-dune/20 px-4 py-2 text-sm font-semibold text-dune/80 hover:border-dune/40"
                          >
                            {workspaceSaving ? "Saving..." : "Save current progress"}
                          </button>
                          {nextLesson ? (
                            <button
                              type="button"
                              onClick={() => setSelectedLessonId(nextLesson.id)}
                              className="rounded-full border border-dune/20 px-4 py-2 text-sm font-semibold text-dune/80 hover:border-dune/40"
                            >
                              Next lesson
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dune/10 bg-midnight/40 p-4 text-sm text-dune/60">
                        This lesson does not have a playable source yet. Add a `source_url` or `content_url` in course management to enable the in-app viewer.
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              persistLessonProgress(
                                selectedLesson.id,
                                Math.max(25, selectedLessonProgress?.progress_percent || 0),
                                selectedLessonProgress?.last_position_seconds || 0,
                                { successMessage: "Reading progress saved." },
                              )
                            }
                            disabled={workspaceSaving}
                            className="rounded-full border border-dune/20 px-4 py-2 text-sm font-semibold text-dune/80 hover:border-dune/40"
                          >
                            {workspaceSaving ? "Saving..." : "Save reading progress"}
                          </button>
                          {nextLesson ? (
                            <button
                              type="button"
                              onClick={() => setSelectedLessonId(nextLesson.id)}
                              className="rounded-full border border-dune/20 px-4 py-2 text-sm font-semibold text-dune/80 hover:border-dune/40"
                            >
                              Next lesson
                            </button>
                          ) : null}
                        </div>
                      </div>
                    )}

                    {(selectedLesson.metadata?.summary || selectedLesson.metadata?.key_points?.length) && (
                      <div className="rounded-2xl border border-dune/10 bg-midnight/40 p-4 space-y-4">
                        {selectedLesson.metadata?.summary && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-ember">Lesson Summary</p>
                            <p className="mt-2 text-sm leading-relaxed text-dune/80">{selectedLesson.metadata.summary}</p>
                          </div>
                        )}
                        {Array.isArray(selectedLesson.metadata?.key_points) && selectedLesson.metadata.key_points.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-ember">Key Points</p>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-dune/80">
                              {selectedLesson.metadata.key_points.map((point: string, index: number) => (
                                <li key={`${selectedLesson.id}-point-${index}`}>{point}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <StudentProgressCard
                lessonsCount={allLessons.length}
                completedLessons={completedLessons}
                courseProgress={courseProgress}
                currentLesson={selectedLesson}
                progressData={progressData}
              />
            </div>
          </div>
        </section>
      </div>

    </main>
  );
}
