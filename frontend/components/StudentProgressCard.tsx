"use client";

import { useEffect, useMemo, useState } from "react";
import { updateProgress } from "@/lib/api";

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
  token: string | null;
  lessons: LessonSummary[];
  progressData: ProgressSummary[];
  onProgressSaved?: () => Promise<void> | void;
};

export default function StudentProgressCard({
  token,
  lessons,
  progressData,
  onProgressSaved,
}: StudentProgressCardProps) {
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [percent, setPercent] = useState("0");
  const [position, setPosition] = useState("0");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedLesson = useMemo(
    () => lessons.find((lesson) => lesson.id === selectedLessonId) || null,
    [lessons, selectedLessonId],
  );

  useEffect(() => {
    if (!lessons.length) {
      setSelectedLessonId("");
      setPercent("0");
      setPosition("0");
      return;
    }

    setSelectedLessonId((current) => {
      if (current && lessons.some((lesson) => lesson.id === current)) {
        return current;
      }
      return lessons[0].id;
    });
  }, [lessons]);

  useEffect(() => {
    if (!selectedLessonId) {
      setPercent("0");
      setPosition("0");
      return;
    }

    const progress = progressData.find((entry) => entry.lesson_id === selectedLessonId);
    setPercent(String(progress?.progress_percent ?? 0));
    setPosition(String(progress?.last_position_seconds ?? 0));
  }, [selectedLessonId, progressData]);

  const handleUpdate = async () => {
    if (!token) {
      setMessage("Sign in to update progress.");
      return;
    }
    if (!selectedLessonId) {
      setMessage("Select a lesson first.");
      return;
    }
    setSaving(true);
    try {
      await updateProgress(
        {
          lesson_id: selectedLessonId,
          progress_percent: Number(percent || 0),
          last_position_seconds: Number(position || 0),
        },
        token,
      );
      setMessage("Progress saved.");
      await onProgressSaved?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update progress");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl bg-midnight/60 p-6">
      <h3 className="font-[var(--font-space)] text-xl">Learning Progress</h3>
      <p className="mt-2 text-sm text-dune/60">
        Save progress for the lesson you are currently studying instead of entering a raw lesson ID.
      </p>
      <div className="mt-4 space-y-3">
        <label className="block space-y-2">
          <span className="text-xs uppercase tracking-widest text-dune/50">Lesson</span>
          <select
            className="w-full rounded-xl bg-midnight px-3 py-2 text-sm"
            value={selectedLessonId}
            onChange={(event) => setSelectedLessonId(event.target.value)}
            disabled={lessons.length === 0}
          >
            {lessons.length === 0 ? (
              <option value="">No lessons available</option>
            ) : (
              lessons.map((lesson) => (
                <option key={lesson.id} value={lesson.id}>
                  {lesson.title}
                </option>
              ))
            )}
          </select>
        </label>
        {selectedLesson && (
          <div className="rounded-xl border border-dune/10 bg-midnight/50 px-3 py-2 text-xs text-dune/65">
            Tracking: <span className="text-dune">{selectedLesson.title}</span>
            {selectedLesson.content_type ? ` • ${selectedLesson.content_type}` : ""}
          </div>
        )}
        <input
          className="w-full rounded-xl bg-midnight px-3 py-2 text-sm"
          placeholder="Progress percent"
          value={percent}
          onChange={(event) => setPercent(event.target.value)}
        />
        <input
          className="w-full rounded-xl bg-midnight px-3 py-2 text-sm"
          placeholder="Last position (seconds)"
          value={position}
          onChange={(event) => setPosition(event.target.value)}
        />
        {message && <p className="text-xs text-ember">{message}</p>}
        <button
          onClick={handleUpdate}
          disabled={saving || lessons.length === 0}
          className="w-full rounded-full bg-ember px-4 py-2 text-sm font-semibold text-midnight"
        >
          {saving ? "Saving..." : "Save progress"}
        </button>
      </div>
    </div>
  );
}
