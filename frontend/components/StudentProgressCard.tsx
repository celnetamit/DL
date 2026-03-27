"use client";

type LessonSummary = {
  id: string;
  title: string;
  content_type?: string;
};

type ProgressSummary = {
  lesson_id: string;
  progress_percent: number;
  last_position_seconds?: number;
};

type StudentProgressCardProps = {
  lessonsCount: number;
  completedLessons: number;
  courseProgress: number;
  currentLesson?: LessonSummary | null;
  progressData: ProgressSummary[];
};

export default function StudentProgressCard({
  lessonsCount,
  completedLessons,
  courseProgress,
  currentLesson,
  progressData,
}: StudentProgressCardProps) {
  const currentLessonProgress = currentLesson
    ? progressData.find((entry) => entry.lesson_id === currentLesson.id)
    : null;
  const startedLessons = progressData.filter((entry) => entry.progress_percent > 0).length;

  return (
    <div className="rounded-2xl bg-midnight/60 p-6">
      <h3 className="font-[var(--font-space)] text-xl">Progress Snapshot</h3>
      <p className="mt-2 text-sm text-dune/60">
        The lesson workspace now handles resume, auto-save, and completion. This panel stays focused on your overall course momentum.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-dune/10 bg-midnight/50 p-4">
          <p className="text-[10px] uppercase tracking-widest text-dune/50">Started</p>
          <p className="mt-2 text-2xl font-[var(--font-space)] text-ember">{startedLessons}</p>
        </div>
        <div className="rounded-xl border border-dune/10 bg-midnight/50 p-4">
          <p className="text-[10px] uppercase tracking-widest text-dune/50">Completed</p>
          <p className="mt-2 text-2xl font-[var(--font-space)] text-ember">
            {completedLessons}/{lessonsCount}
          </p>
        </div>
        <div className="rounded-xl border border-dune/10 bg-midnight/50 p-4">
          <p className="text-[10px] uppercase tracking-widest text-dune/50">Overall</p>
          <p className="mt-2 text-2xl font-[var(--font-space)] text-ember">{courseProgress}%</p>
        </div>
      </div>

      {currentLesson ? (
        <div className="mt-4 rounded-xl border border-dune/10 bg-midnight/50 px-4 py-3 text-sm text-dune/70">
          <p className="text-[10px] uppercase tracking-widest text-dune/45">Current Focus</p>
          <p className="mt-2 font-semibold text-dune">{currentLesson.title}</p>
          <p className="mt-1 text-xs text-dune/55">
            {currentLesson.content_type || "Lesson"} • {Math.round(currentLessonProgress?.progress_percent || 0)}% tracked
          </p>
        </div>
      ) : null}

      <div className="mt-4 rounded-xl border border-dune/10 bg-midnight/50 px-4 py-3 text-xs leading-relaxed text-dune/60">
        Use the lesson workspace actions to resume, save, or complete the active lesson. Your course recommendations update automatically from that activity.
      </div>
    </div>
  );
}
