"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getLeadEvents, retryLeadEvent } from "@/lib/api";
import Toast from "@/components/Toast";

type LeadEvent = {
  id: string;
  lead_type: string;
  source: string;
  full_name: string;
  email: string;
  phone?: string;
  institution_name?: string;
  subject?: string;
  message?: string;
  plan_code?: string;
  product_name?: string;
  amount?: number;
  currency?: string;
  sync_status: string;
  sync_attempt_count: number;
  last_error?: string;
  synced_at?: string;
  last_attempted_at?: string;
  created_at: string;
  user_email?: string;
  user_name?: string;
};

export default function LeadEventsPanel({ token }: { token: string | null }) {
  const [events, setEvents] = useState<LeadEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [leadTypeFilter, setLeadTypeFilter] = useState("");
  const [retryingLeadId, setRetryingLeadId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  const loadEvents = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await getLeadEvents(token, {
        status: statusFilter || undefined,
        lead_type: leadTypeFilter || undefined,
      });
      setEvents(data || []);
    } catch (error: any) {
      setToast({ message: error.message || "Unable to load lead events.", tone: "error" });
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, leadTypeFilter]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const failedCount = useMemo(() => events.filter((entry) => entry.sync_status === "failed").length, [events]);
  const syncedCount = useMemo(() => events.filter((entry) => entry.sync_status === "synced").length, [events]);

  const handleRetry = async (leadId: string) => {
    if (!token) return;
    setRetryingLeadId(leadId);
    try {
      await retryLeadEvent(leadId, token);
      setToast({ message: "Lead sync retried successfully.", tone: "success" });
      await loadEvents();
    } catch (error: any) {
      setToast({ message: error.message || "Lead retry failed.", tone: "error" });
    } finally {
      setRetryingLeadId(null);
    }
  };

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="glass rounded-2xl p-6 border border-dune/10">
          <p className="text-[10px] uppercase tracking-widest text-dune/55">Total Leads</p>
          <p className="mt-4 text-4xl font-[var(--font-space)] text-ember">{events.length}</p>
        </div>
        <div className="glass rounded-2xl p-6 border border-dune/10">
          <p className="text-[10px] uppercase tracking-widest text-dune/55">Synced</p>
          <p className="mt-4 text-4xl font-[var(--font-space)] text-moss">{syncedCount}</p>
        </div>
        <div className="glass rounded-2xl p-6 border border-dune/10">
          <p className="text-[10px] uppercase tracking-widest text-dune/55">Failed</p>
          <p className="mt-4 text-4xl font-[var(--font-space)] text-ember">{failedCount}</p>
        </div>
      </section>

      <div className="glass rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-[var(--font-space)] text-xl">CRM Lead Sync Monitor</h3>
            <p className="mt-1 text-xs text-dune/55">Review website, purchase-request, and checkout lead sync outcomes and retry failed pushes.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg bg-midnight/60 border border-dune/20 px-3 py-1.5 text-xs"
            >
              <option value="">All Status</option>
              <option value="synced">Synced</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
            <select
              value={leadTypeFilter}
              onChange={(e) => setLeadTypeFilter(e.target.value)}
              className="rounded-lg bg-midnight/60 border border-dune/20 px-3 py-1.5 text-xs"
            >
              <option value="">All Lead Types</option>
              <option value="query">Query</option>
              <option value="purchase_request">Purchase Request</option>
              <option value="purchase">Purchase</option>
            </select>
            <button
              onClick={loadEvents}
              className="rounded-full bg-ember px-4 py-1.5 text-xs font-semibold text-midnight"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-dune/50">Loading lead events...</p>
        ) : events.length === 0 ? (
          <p className="mt-6 text-sm text-dune/50">No lead events found for the current filters.</p>
        ) : (
          <div className="mt-6 space-y-3">
            {events.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-dune/10 bg-midnight/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${
                          entry.sync_status === "synced"
                            ? "bg-moss/20 text-moss"
                            : entry.sync_status === "failed"
                              ? "bg-ember/20 text-ember"
                              : "bg-dune/15 text-dune/70"
                        }`}
                      >
                        {entry.sync_status}
                      </span>
                      <span className="text-[10px] uppercase tracking-widest text-dune/45">{entry.lead_type}</span>
                      <span className="text-[10px] uppercase tracking-widest text-dune/45">{entry.source}</span>
                      {entry.product_name && (
                        <span className="rounded-full bg-dune/10 px-2 py-1 text-[10px] uppercase tracking-widest text-dune/55">
                          {entry.product_name}
                        </span>
                      )}
                    </div>
                    <p className="mt-3 font-semibold text-dune">{entry.full_name} · {entry.email}</p>
                    <p className="mt-1 text-xs text-dune/55">
                      {entry.institution_name || "No institution"} · {new Date(entry.created_at).toLocaleString()}
                    </p>
                    {entry.subject && <p className="mt-2 text-sm text-dune/75">{entry.subject}</p>}
                    {entry.message && <p className="mt-1 text-sm text-dune/60">{entry.message}</p>}
                  </div>
                  <div className="text-right text-xs text-dune/50">
                    <p>Attempts: {entry.sync_attempt_count}</p>
                    {entry.last_attempted_at && <p className="mt-1">Last try: {new Date(entry.last_attempted_at).toLocaleString()}</p>}
                    {entry.sync_status === "failed" && (
                      <button
                        onClick={() => handleRetry(entry.id)}
                        disabled={retryingLeadId === entry.id}
                        className="mt-3 rounded-full border border-ember/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-ember disabled:opacity-60"
                      >
                        {retryingLeadId === entry.id ? "Retrying..." : "Retry Sync"}
                      </button>
                    )}
                  </div>
                </div>
                {entry.last_error && (
                  <div className="mt-4 rounded-xl border border-ember/20 bg-ember/5 p-3 text-sm text-ember">
                    {entry.last_error}
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
