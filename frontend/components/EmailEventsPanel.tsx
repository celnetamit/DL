"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getEmailEvents } from "@/lib/api";
import Toast from "@/components/Toast";

type EmailEvent = {
  id: string;
  sns_message_id: string;
  topic_arn: string;
  event_type: string;
  notification_type: string;
  ses_message_id?: string;
  source_email?: string;
  subject?: string;
  primary_recipient?: string;
  status: string;
  diagnostic_message?: string;
  event_at?: string;
  created_at: string;
};

export default function EmailEventsPanel({ token }: { token: string | null }) {
  const [events, setEvents] = useState<EmailEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  const loadEvents = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await getEmailEvents(token, {
        event_type: eventTypeFilter || undefined,
        status: statusFilter || undefined,
      });
      setEvents(data || []);
    } catch (error: any) {
      setToast({ message: error.message || "Unable to load email events.", tone: "error" });
    } finally {
      setLoading(false);
    }
  }, [token, eventTypeFilter, statusFilter]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const bounceCount = useMemo(() => events.filter((entry) => entry.event_type.toLowerCase() === "bounce").length, [events]);
  const complaintCount = useMemo(() => events.filter((entry) => entry.event_type.toLowerCase() === "complaint").length, [events]);
  const deliveryCount = useMemo(() => events.filter((entry) => entry.event_type.toLowerCase() === "delivery").length, [events]);

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}

      <section className="grid gap-4 md:grid-cols-4">
        <div className="glass rounded-2xl p-6 border border-dune/10">
          <p className="text-[10px] uppercase tracking-widest text-dune/55">Total Events</p>
          <p className="mt-4 text-4xl font-[var(--font-space)] text-ember">{events.length}</p>
        </div>
        <div className="glass rounded-2xl p-6 border border-dune/10">
          <p className="text-[10px] uppercase tracking-widest text-dune/55">Deliveries</p>
          <p className="mt-4 text-4xl font-[var(--font-space)] text-moss">{deliveryCount}</p>
        </div>
        <div className="glass rounded-2xl p-6 border border-dune/10">
          <p className="text-[10px] uppercase tracking-widest text-dune/55">Bounces</p>
          <p className="mt-4 text-4xl font-[var(--font-space)] text-ember">{bounceCount}</p>
        </div>
        <div className="glass rounded-2xl p-6 border border-dune/10">
          <p className="text-[10px] uppercase tracking-widest text-dune/55">Complaints</p>
          <p className="mt-4 text-4xl font-[var(--font-space)] text-ember">{complaintCount}</p>
        </div>
      </section>

      <div className="glass rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-[var(--font-space)] text-xl">SES / SNS Delivery Events</h3>
            <p className="mt-1 text-xs text-dune/55">Inspect delivery, bounce, and complaint notifications published from SES through SNS.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="rounded-lg bg-midnight/60 border border-dune/20 px-3 py-1.5 text-xs"
            >
              <option value="">All Event Types</option>
              <option value="Delivery">Delivery</option>
              <option value="Bounce">Bounce</option>
              <option value="Complaint">Complaint</option>
            </select>
            <input
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              placeholder="Status"
              className="rounded-lg bg-midnight/60 border border-dune/20 px-3 py-1.5 text-xs"
            />
            <button
              onClick={loadEvents}
              className="rounded-full bg-ember px-4 py-1.5 text-xs font-semibold text-midnight"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-dune/50">Loading email events...</p>
        ) : events.length === 0 ? (
          <p className="mt-6 text-sm text-dune/50">No SES/SNS email events found for the current filters.</p>
        ) : (
          <div className="mt-6 space-y-3">
            {events.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-dune/10 bg-midnight/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-dune/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-dune/70">
                        {entry.event_type}
                      </span>
                      <span className="text-[10px] uppercase tracking-widest text-dune/45">{entry.status}</span>
                      {entry.primary_recipient && (
                        <span className="rounded-full bg-dune/10 px-2 py-1 text-[10px] uppercase tracking-widest text-dune/55">
                          {entry.primary_recipient}
                        </span>
                      )}
                    </div>
                    <p className="mt-3 font-semibold text-dune">{entry.subject || "Untitled Email"}</p>
                    <p className="mt-1 text-xs text-dune/55">
                      {entry.source_email || "Unknown sender"} · {new Date(entry.created_at).toLocaleString()}
                    </p>
                    {entry.ses_message_id && <p className="mt-1 text-xs text-dune/45">SES Message ID: {entry.ses_message_id}</p>}
                  </div>
                  <div className="text-right text-xs text-dune/50">
                    {entry.event_at && <p>Event At: {new Date(entry.event_at).toLocaleString()}</p>}
                    <p className="mt-1 max-w-[260px] truncate">SNS: {entry.sns_message_id}</p>
                  </div>
                </div>
                {entry.diagnostic_message && (
                  <div className="mt-4 rounded-xl border border-ember/20 bg-ember/5 p-3 text-sm text-ember">
                    {entry.diagnostic_message}
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
