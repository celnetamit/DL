"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getAIGenerationLogs } from "@/lib/api";
import Toast from "@/components/Toast";

type AILog = {
  id: string;
  status: string;
  provider: string;
  model: string;
  prompt_version: string;
  source_type: string;
  source_url?: string;
  requested_title?: string;
  error_message?: string;
  created_at: string;
  user_email?: string;
  user_name?: string;
  lesson_title?: string;
  module_title?: string;
  course_title?: string;
};

export default function AIGenerationPanel({ token }: { token: string | null }) {
  const [logs, setLogs] = useState<AILog[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  const loadLogs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await getAIGenerationLogs(token, {
        status: statusFilter || undefined,
        provider: providerFilter || undefined,
        model: modelFilter || undefined,
        limit: 100,
      });
      setLogs(data || []);
    } catch (error: any) {
      setToast({ message: error.message || "Unable to load AI generation logs.", tone: "error" });
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, providerFilter, modelFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const failureCount = useMemo(() => logs.filter((entry) => entry.status === "failed").length, [logs]);
  const successCount = useMemo(() => logs.filter((entry) => entry.status === "success").length, [logs]);
  const providerCounts = useMemo(() => {
    return logs.reduce<Record<string, number>>((acc, entry) => {
      acc[entry.provider] = (acc[entry.provider] || 0) + 1;
      return acc;
    }, {});
  }, [logs]);

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="glass rounded-2xl p-6 border border-dune/10">
          <p className="text-[10px] uppercase tracking-widest text-dune/55">Recent Runs</p>
          <p className="mt-4 text-4xl font-[var(--font-space)] text-ember">{logs.length}</p>
        </div>
        <div className="glass rounded-2xl p-6 border border-dune/10">
          <p className="text-[10px] uppercase tracking-widest text-dune/55">Successful</p>
          <p className="mt-4 text-4xl font-[var(--font-space)] text-moss">{successCount}</p>
        </div>
        <div className="glass rounded-2xl p-6 border border-dune/10">
          <p className="text-[10px] uppercase tracking-widest text-dune/55">Failed</p>
          <p className="mt-4 text-4xl font-[var(--font-space)] text-ember">{failureCount}</p>
        </div>
      </section>

      <div className="glass rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-[var(--font-space)] text-xl">AI Generation Audit Trail</h3>
            <p className="mt-1 text-xs text-dune/55">Inspect provider behavior, failures, prompt versions, and generated lesson output.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg bg-midnight/60 border border-dune/20 px-3 py-1.5 text-xs"
            >
              <option value="">All Status</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
            <input
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              placeholder="Provider"
              className="rounded-lg bg-midnight/60 border border-dune/20 px-3 py-1.5 text-xs"
            />
            <input
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              placeholder="Model"
              className="rounded-lg bg-midnight/60 border border-dune/20 px-3 py-1.5 text-xs"
            />
            <button
              onClick={loadLogs}
              className="rounded-full bg-ember px-4 py-1.5 text-xs font-semibold text-midnight"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-dune/55">
          {Object.entries(providerCounts).map(([provider, count]) => (
            <span key={provider} className="rounded-full bg-dune/10 px-3 py-1 uppercase tracking-widest">
              {provider}: {count}
            </span>
          ))}
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-dune/50">Loading AI generation logs...</p>
        ) : logs.length === 0 ? (
          <p className="mt-6 text-sm text-dune/50">No AI generation logs found for the current filters.</p>
        ) : (
          <div className="mt-6 space-y-3">
            {logs.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-dune/10 bg-midnight/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${
                          entry.status === "success" ? "bg-moss/20 text-moss" : "bg-ember/20 text-ember"
                        }`}
                      >
                        {entry.status}
                      </span>
                      <span className="text-[10px] uppercase tracking-widest text-dune/45">{entry.provider}</span>
                      <span className="text-[10px] uppercase tracking-widest text-dune/45">{entry.model}</span>
                      <span className="text-[10px] uppercase tracking-widest text-dune/45">{entry.prompt_version}</span>
                    </div>
                    <p className="mt-3 font-semibold text-dune">{entry.lesson_title || entry.requested_title || "Untitled AI Generation"}</p>
                    <p className="mt-1 text-xs text-dune/55">
                      {entry.course_title || "Unknown Course"} · {entry.module_title || "Unknown Module"}
                    </p>
                    <p className="mt-1 text-xs text-dune/45">
                      {entry.user_name || entry.user_email || "System"} · {new Date(entry.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right text-xs text-dune/50">
                    <p className="uppercase tracking-widest">{entry.source_type}</p>
                    {entry.source_url && (
                      <a href={entry.source_url} target="_blank" rel="noreferrer" className="mt-1 block max-w-[260px] truncate text-ember">
                        {entry.source_url}
                      </a>
                    )}
                  </div>
                </div>
                {entry.error_message && (
                  <div className="mt-4 rounded-xl border border-ember/20 bg-ember/5 p-3 text-sm text-ember">
                    {entry.error_message}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
