"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
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

  const handleMarkComplete = async (lessonId: string) => {
    if (!token) return;
    try {
      await updateProgress({ lesson_id: lessonId, progress_percent: 100, last_position_seconds: 0 }, token);
      const newProg = await getUserProgress(token);
      setProgressData(newProg || []);
    } catch (err) {
      console.error("Failed to mark complete", err);
    }
  };

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
  const lessonUrl = getLessonUrl(selectedLesson);

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

  // Determine overall progress and next lesson logic if needed
  // For Sprint 1, we pass the info to StudentProgressCard or show it inline.

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-ember">Course Detail</p>
            <h1 className="font-[var(--font-space)] text-3xl">{course.title}</h1>
            {course.description && <p className="mt-2 text-dune/80">{course.description}</p>}
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
                  <p className="text-[10px] uppercase tracking-widest text-dune/50">Access Model</p>
                  <p className="mt-3 text-sm text-dune/70">
                    Signed-in access is enabled. Product-linked course entitlements will be enforced after course-to-product mapping is implemented.
                  </p>
                </div>
              </div>

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
                                      onClick={() => handleMarkComplete(lesson.id)}
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
                      </div>
                    </div>

                    {lessonUrl ? (
                      <div className="space-y-4">
                        {isVideoLesson(selectedLesson.content_type) ? (
                          <video
                            key={selectedLesson.id}
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
                            onClick={() => handleMarkComplete(selectedLesson.id)}
                            className="rounded-full border border-ember/40 px-4 py-2 text-sm font-semibold text-ember hover:bg-ember hover:text-midnight transition"
                          >
                            Mark lesson complete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dune/10 bg-midnight/40 p-4 text-sm text-dune/60">
                        This lesson does not have a playable source yet. Add a `source_url` or `content_url` in course management to enable the in-app viewer.
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
                token={token}
                lessons={allLessons}
                progressData={progressData}
                onProgressSaved={async () => {
                  const newProg = await getUserProgress(token);
                  setProgressData(newProg || []);
                }}
              />
            </div>
          </div>
        </section>
      </div>

    </main>
  );
}
