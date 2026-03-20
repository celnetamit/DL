"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import Toast from "@/components/Toast";

type Setting = {
  id: string;
  key: string;
  value: string;
  label: string;
  group: string;
  is_secret: boolean;
};

// The canonical list of configurable settings
const SETTING_DEFINITIONS = [
  // ── Razorpay ──
  { key: "RAZORPAY_KEY_ID", label: "Razorpay Key ID", group: "Payment Gateway", is_secret: false },
  { key: "RAZORPAY_KEY_SECRET", label: "Razorpay Key Secret", group: "Payment Gateway", is_secret: true },
  { key: "RAZORPAY_WEBHOOK_SECRET", label: "Razorpay Webhook Secret", group: "Payment Gateway", is_secret: true },
  // ── Auth ──
  { key: "JWT_SECRET", label: "JWT Secret Key", group: "Authentication", is_secret: true },
  // ── App ──
  { key: "APP_BASE_URL", label: "App Base URL", group: "Application", is_secret: false },
  { key: "AI_ENGINE_URL", label: "AI Engine URL", group: "Application", is_secret: false },
  // ── Email (future) ──
  { key: "SMTP_HOST", label: "SMTP Host", group: "Email", is_secret: false },
  { key: "SMTP_PORT", label: "SMTP Port", group: "Email", is_secret: false },
  { key: "SMTP_USER", label: "SMTP Username", group: "Email", is_secret: false },
  { key: "SMTP_PASS", label: "SMTP Password", group: "Email", is_secret: true },
  { key: "FROM_EMAIL", label: "From Email Address", group: "Email", is_secret: false },
  // ── Google OAuth (future) ──
  { key: "GOOGLE_CLIENT_ID", label: "Google OAuth Client ID", group: "OAuth", is_secret: false },
  { key: "GOOGLE_CLIENT_SECRET", label: "Google OAuth Client Secret", group: "OAuth", is_secret: true },
];

const GROUP_ICONS: Record<string, string> = {
  "Payment Gateway": "💳",
  "Authentication": "🔐",
  "Application": "⚙️",
  "Email": "📧",
  "OAuth": "🔗",
};

export default function SettingsPanel() {
  const { token } = useAuth();
  const [values, setValues] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiFetch<Setting[]>("/api/v1/settings", { cache: "no-store" }, token);
      const map: Record<string, string> = {};
      (res || []).forEach((s) => { map[s.key] = s.value; });
      setValues(map);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const payload = SETTING_DEFINITIONS.map((def) => ({
        key: def.key,
        value: values[def.key] || "",
        label: def.label,
        group: def.group,
        is_secret: def.is_secret,
      }));
      await apiFetch("/api/v1/settings", {
        method: "POST",
        body: JSON.stringify(payload),
      }, token);
      setSaved(true);
      setToast({ message: "Settings saved successfully.", tone: "success" });
      setTimeout(() => setSaved(false), 3000);
      fetchSettings();
    } catch (err) {
      console.error(err);
      setToast({ message: "Failed to save settings", tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-dune/60 p-6 text-sm">Loading settings...</p>;

  // Group the definitions
  const groups = Array.from(new Set(SETTING_DEFINITIONS.map((d) => d.group)));

  return (
    <div className="max-w-3xl space-y-6">
      {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-[var(--font-space)]">API Configuration</h3>
          <p className="text-xs text-dune/50 mt-1">
            Settings saved here override the server environment variables at runtime.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
            saved
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : "bg-ember text-midnight hover:opacity-90"
          } disabled:opacity-50`}
        >
          {saved ? "✓ Saved!" : saving ? "Saving..." : "Save All Settings"}
        </button>
      </div>

      {groups.map((group) => {
        const defs = SETTING_DEFINITIONS.filter((d) => d.group === group);
        return (
          <div key={group} className="glass rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-dune/10 bg-dune/5">
              <span>{GROUP_ICONS[group] || "⚙️"}</span>
              <h4 className="text-sm font-semibold">{group}</h4>
              <span className="text-xs text-dune/40 ml-1">{defs.length} settings</span>
            </div>
            <div className="divide-y divide-dune/5">
              {defs.map((def) => {
                const ismasked = def.is_secret && values[def.key] === "••••••••";
                const isRevealed = revealed[def.key];
                return (
                  <div key={def.key} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <label className="block space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-dune/80">{def.label}</span>
                            {def.is_secret && (
                              <span className="text-[9px] uppercase tracking-widest bg-ember/10 text-ember rounded-full px-2 py-0.5">
                                Secret
                              </span>
                            )}
                            {values[def.key] && values[def.key] !== "••••••••" && (
                              <span className="text-[9px] uppercase tracking-widest bg-green-500/10 text-green-400 rounded-full px-2 py-0.5">
                                Configured
                              </span>
                            )}
                          </div>
                          <code className="text-[10px] text-dune/30 font-mono">{def.key}</code>
                          <div className="flex gap-1">
                            <input
                              type={def.is_secret && !isRevealed ? "password" : "text"}
                              className="w-full rounded-lg bg-midnight/60 border border-dune/20 px-3 py-1.5 text-sm text-dune focus:border-ember focus:outline-none font-mono"
                              placeholder={ismasked ? "Click reveal to edit" : `Enter ${def.label}`}
                              value={ismasked ? "" : (values[def.key] || "")}
                              readOnly={ismasked}
                              onChange={(e) => setValues({ ...values, [def.key]: e.target.value })}
                            />
                            {def.is_secret && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (ismasked) {
                                    // Clear the masked value so user can type a new one
                                    setValues({ ...values, [def.key]: "" });
                                  }
                                  setRevealed({ ...revealed, [def.key]: !isRevealed });
                                }}
                                className="shrink-0 rounded-lg border border-dune/20 px-3 text-xs text-dune/50 hover:border-dune/40 hover:text-dune transition-colors"
                              >
                                {isRevealed ? "Hide" : "Edit"}
                              </button>
                            )}
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="glass rounded-2xl p-4 border border-amber-500/20 bg-amber-500/5">
        <p className="text-xs text-amber-400">
          ⚠️ <strong>Note:</strong> Changes to Razorpay keys, JWT Secret, and AI Engine URL take effect on the <em>next backend restart</em> for live connections. All other settings are read dynamically.
        </p>
      </div>
    </div>
  );
}
