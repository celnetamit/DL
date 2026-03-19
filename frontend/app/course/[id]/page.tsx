"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";

import StudentProgressCard from "@/components/StudentProgressCard";
import { getCourse, getUserProgress, updateProgress } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function CourseDetailPage({ params }: { params: { id: string } }) {
  const { token, loading: authLoading } = useAuth();
  const [course, setCourse] = useState<any>(null);
  const [progressData, setProgressData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
        setCourse(courseRes);
        setProgressData(progRes || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
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
        <p className="text-dune/60">Course not found.</p>
      </main>
    );
  }

  const modules = [...(course.modules || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

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
                Each lesson adapts based on learner behavior. Resume from the exact second you paused, and let the AI
                tutor suggest the next best module.
              </p>

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

                          return (
                            <div key={lesson.id} className="flex flex-col bg-midnight rounded-xl p-4 border border-dune/10">
                              <div className="flex justify-between items-center">
                                <div className="flex-1">
                                  <span className="text-sm font-semibold text-dune">{lesson.title}</span>
                                  <div className="mt-2 h-1.5 w-full rounded-full bg-dune/10">
                                    <div className="h-1.5 rounded-full bg-ember transition-all" style={{ width: `${progressPercent}%` }} />
                                  </div>
                                </div>
                                <span className="text-xs text-dune/40 uppercase ml-4 text-right">
                                  {lesson.content_type} <br/> {Math.round(progressPercent)}%
                                  {progressPercent < 100 && (
                                    <button
                                      onClick={() => handleMarkComplete(lesson.id)}
                                      className="block mt-2 rounded border border-ember/50 px-2 py-0.5 text-[10px] text-ember hover:bg-ember hover:text-midnight transition"
                                    >
                                      Mark Complete
                                    </button>
                                  )}
                                </span>
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

            <StudentProgressCard />
          </div>
        </section>
      </div>

    </main>
  );
}
