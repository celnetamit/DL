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
  effective_source?: "db_override" | "env_fallback" | "unset";
  db_configured?: boolean;
  env_configured?: boolean;
  validation_errors?: string[];
};

type SettingDefinition = {
  key: string;
  label: string;
  group: string;
  is_secret: boolean;
  description?: string;
  placeholder?: string;
};

const SETTING_DEFINITIONS: SettingDefinition[] = [
  // ── Razorpay ──
  { key: "RAZORPAY_KEY_ID", label: "Razorpay Key ID", group: "Payment Gateway", is_secret: false, placeholder: "rzp_live_xxxxx", description: "Public key used when creating orders and client payment flows." },
  { key: "RAZORPAY_KEY_SECRET", label: "Razorpay Key Secret", group: "Payment Gateway", is_secret: true, description: "Server-side secret used for Razorpay API authentication." },
  { key: "RAZORPAY_WEBHOOK_SECRET", label: "Razorpay Webhook Secret", group: "Payment Gateway", is_secret: true, description: "Secret used to verify Razorpay webhook signatures." },
  // ── Auth ──
  { key: "JWT_SECRET", label: "JWT Secret Key", group: "Authentication", is_secret: true, description: "Used to sign authentication tokens. Production value should be strong and long." },
  // ── App ──
  { key: "APP_BASE_URL", label: "App Base URL", group: "Application", is_secret: false, placeholder: "https://app.example.com", description: "Canonical public application URL used in links and notifications." },
  { key: "AI_ENGINE_URL", label: "AI Engine URL", group: "Application", is_secret: false, placeholder: "http://ai-engine:8000", description: "Backend endpoint for AI lesson generation requests." },
  { key: "TRUSTED_PROXIES", label: "Trusted Proxies", group: "Application", is_secret: false, placeholder: "127.0.0.1,::1", description: "Comma-separated proxy IPs forwarded to Gin for request trust handling." },
  // ── CRM / Leads ──
  { key: "LEAD_WEBHOOK_URL", label: "Lead Webhook URL", group: "CRM & Leads", is_secret: false, placeholder: "https://crm.example.com/webhooks/leads", description: "Destination webhook for lead sync and purchase-request events." },
  { key: "LEAD_WEBHOOK_SECRET", label: "Lead Webhook Secret", group: "CRM & Leads", is_secret: true, description: "Shared secret used to sign lead webhook payloads." },
  { key: "LEAD_COMPANY_ID", label: "Lead Company ID", group: "CRM & Leads", is_secret: false, placeholder: "CELNET-001", description: "CRM company/account identifier used when syncing lead records." },
  // ── AWS Email & Notifications ──
  { key: "AWS_REGION", label: "AWS Region", group: "Email & Notifications", is_secret: false, placeholder: "ap-south-1", description: "AWS region used for SES and SNS integrations." },
  { key: "SES_FROM_EMAIL", label: "SES From Email", group: "Email & Notifications", is_secret: false, placeholder: "noreply@example.com", description: "Verified SES sender address for platform emails." },
  { key: "SES_CONFIGURATION_SET", label: "SES Configuration Set", group: "Email & Notifications", is_secret: false, placeholder: "delivery-tracking", description: "Optional SES configuration set for event tracking and routing." },
  { key: "SNS_ALERT_TOPIC_ARN", label: "SNS Alert Topic ARN", group: "Email & Notifications", is_secret: false, placeholder: "arn:aws:sns:ap-south-1:123456789012:alerts", description: "SNS topic for operational alerts and escalations." },
  { key: "SES_SNS_TOPIC_ARN", label: "SES SNS Topic ARN", group: "Email & Notifications", is_secret: false, placeholder: "arn:aws:sns:ap-south-1:123456789012:ses-events", description: "SNS topic used by SES for delivery and bounce notifications." },
  // ── Google OAuth ──
  { key: "GOOGLE_CLIENT_ID", label: "Google OAuth Client ID", group: "OAuth", is_secret: false, placeholder: "xxxxx.apps.googleusercontent.com", description: "Client ID for Google sign-in." },
  { key: "GOOGLE_CLIENT_SECRET", label: "Google OAuth Client Secret", group: "OAuth", is_secret: true, description: "Server secret for Google OAuth flows." },
  { key: "GOOGLE_REDIRECT_URL", label: "Google OAuth Redirect URL", group: "OAuth", is_secret: false, placeholder: "https://api.example.com/api/v1/auth/google/callback", description: "Redirect callback URL registered in Google Cloud." },
];

const GROUP_ICONS: Record<string, string> = {
  "Payment Gateway": "💳",
  "Authentication": "🔐",
  "Application": "⚙️",
  "CRM & Leads": "📨",
  "Email & Notifications": "📧",
  "OAuth": "🔗",
};

export default function SettingsPanel() {
  const { token } = useAuth();
  const [values, setValues] = useState<Record<string, string>>({});
  const [meta, setMeta] = useState<Record<string, Setting>>({});
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
      const metaMap: Record<string, Setting> = {};
      (res || []).forEach((s) => {
        map[s.key] = s.value;
        metaMap[s.key] = s;
      });
      setValues(map);
      setMeta(metaMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const getClientValidationErrors = (key: string, value: string) => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "••••••••") return [] as string[];

    const issues: string[] = [];
    const isURL = /^https?:\/\//i;
    const isAWSRegion = /^[a-z]{2}-[a-z]+-\d$/;
    const isEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    const isGoogleClientID = /\.apps\.googleusercontent\.com$/;
    const isTopicARN = /^arn:aws:sns:[a-z0-9-]+:\d{12}:.+$/i;

    switch (key) {
      case "APP_BASE_URL":
      case "AI_ENGINE_URL":
      case "LEAD_WEBHOOK_URL":
      case "GOOGLE_REDIRECT_URL":
        if (!isURL.test(trimmed)) issues.push("Must be a valid http or https URL.");
        break;
      case "AWS_REGION":
        if (!isAWSRegion.test(trimmed)) issues.push("Must look like a valid AWS region.");
        break;
      case "SES_FROM_EMAIL":
        if (!isEmail.test(trimmed)) issues.push("Must be a valid email address.");
        break;
      case "SNS_ALERT_TOPIC_ARN":
      case "SES_SNS_TOPIC_ARN":
        if (!isTopicARN.test(trimmed)) issues.push("Must be a valid SNS topic ARN.");
        break;
      case "GOOGLE_CLIENT_ID":
        if (!isGoogleClientID.test(trimmed)) issues.push("Should end with .apps.googleusercontent.com.");
        break;
      case "JWT_SECRET":
        if (trimmed.length < 32) issues.push("Should be at least 32 characters long.");
        break;
      case "TRUSTED_PROXIES":
        if (trimmed.includes(" ")) issues.push("Use comma-separated values without spaces around IPs.");
        break;
    }

    return issues;
  };

  const hasValidationErrors = SETTING_DEFINITIONS.some((def) => getClientValidationErrors(def.key, values[def.key] || "").length > 0);

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
          disabled={saving || hasValidationErrors}
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
                const source = meta[def.key]?.effective_source || "unset";
                const validationErrors = getClientValidationErrors(def.key, values[def.key] || "");
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
                            <span
                              className={`text-[9px] uppercase tracking-widest rounded-full px-2 py-0.5 ${
                                source === "db_override"
                                  ? "bg-sky-500/10 text-sky-300"
                                  : source === "env_fallback"
                                    ? "bg-amber-500/10 text-amber-300"
                                    : "bg-dune/10 text-dune/40"
                              }`}
                            >
                              {source === "db_override" ? "DB Override" : source === "env_fallback" ? "Env Fallback" : "Unset"}
                            </span>
                          </div>
                          <code className="text-[10px] text-dune/30 font-mono">{def.key}</code>
                          {def.description && (
                            <p className="text-[11px] leading-relaxed text-dune/45">{def.description}</p>
                          )}
                          <div className="flex gap-1">
                            <input
                              type={def.is_secret && !isRevealed ? "password" : "text"}
                              className="w-full rounded-lg bg-midnight/60 border border-dune/20 px-3 py-1.5 text-sm text-dune focus:border-ember focus:outline-none font-mono"
                              placeholder={ismasked ? "Click reveal to edit" : (def.placeholder || `Enter ${def.label}`)}
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
                          {(meta[def.key]?.validation_errors?.length || validationErrors.length) ? (
                            <div className="space-y-1 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                              {meta[def.key]?.validation_errors?.map((issue) => (
                                <p key={`server-${def.key}-${issue}`} className="text-[11px] text-amber-300">
                                  {issue}
                                </p>
                              ))}
                              {validationErrors.map((issue) => (
                                <p key={`client-${def.key}-${issue}`} className="text-[11px] text-amber-300">
                                  {issue}
                                </p>
                              ))}
                            </div>
                          ) : null}
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
        <div className="space-y-2 text-xs text-amber-400">
          <p>
            ⚠️ <strong>Note:</strong> Settings saved here override matching server environment variables for database-backed reads.
          </p>
          <p>
            Changes to authentication secrets, payment keys, OAuth credentials, proxy configuration, and integration endpoints are safest when followed by a backend restart.
          </p>
          {hasValidationErrors && (
            <p>
              Resolve the highlighted validation issues before saving. The save button is disabled while invalid values are present.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
