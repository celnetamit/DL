"use client";

import { useState } from "react";
import { updateProgress } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function StudentProgressCard() {
  const { token } = useAuth();
  const [lessonId, setLessonId] = useState("");
  const [percent, setPercent] = useState("40");
  const [position, setPosition] = useState("0");
  const [message, setMessage] = useState<string | null>(null);

  const handleUpdate = async () => {
    if (!token) {
      setMessage("Sign in to update progress.");
      return;
    }
    try {
      await updateProgress(
        {
          lesson_id: lessonId,
          progress_percent: Number(percent || 0),
          last_position_seconds: Number(position || 0),
        },
        token,
      );
      setMessage("Progress saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update progress");
    }
  };

  return (
    <div className="rounded-2xl bg-midnight/60 p-6">
      <h3 className="font-[var(--font-space)] text-xl">Update Progress</h3>
      <div className="mt-4 space-y-3">
        <input
          className="w-full rounded-xl bg-midnight px-3 py-2 text-sm"
          placeholder="Lesson ID"
          value={lessonId}
          onChange={(event) => setLessonId(event.target.value)}
        />
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
          className="w-full rounded-full bg-ember px-4 py-2 text-sm font-semibold text-midnight"
        >
          Save progress
        </button>
      </div>
    </div>
  );
}
