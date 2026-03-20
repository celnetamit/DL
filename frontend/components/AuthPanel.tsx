"use client";

import { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ROLE_CONTENT_MANAGER,
  ROLE_INSTITUTION_ADMIN,
  ROLE_INSTRUCTOR,
  ROLE_STUDENT,
  ROLE_SUBSCRIPTION_MANAGER,
  ROLE_SUPER_ADMIN,
  roleLabel,
} from "@/lib/roles";

const ROLE_SWITCH_OPTIONS = [
  ROLE_STUDENT,
  ROLE_INSTRUCTOR,
  ROLE_INSTITUTION_ADMIN,
  ROLE_CONTENT_MANAGER,
  ROLE_SUBSCRIPTION_MANAGER,
];

function AuthPanelInner() {
  const { token, user, loading, login, register, logout, loginWithGoogle, switchRole, revertRole } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const authMode = searchParams.get("auth");
  
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("instructor");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [switchRoleValue, setSwitchRoleValue] = useState(ROLE_STUDENT);

  useEffect(() => {
    if (token) return;
    if (authMode === "register") {
      setMode("register");
      return;
    }
    if (authMode === "login") {
      setMode("login");
    }
  }, [authMode, token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "login") {
        await login(email, password);
        setMessage("Logged in successfully.");
        if (redirect) {
          router.push(redirect);
        }
      } else {
        await register(email, password, fullName, role, code);
        setMessage("Registered and logged in.");
        if (redirect) {
          router.push(redirect);
        }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="glass rounded-2xl p-6">Loading session...</div>;
  }

  if (token && user) {
    const roleNames = (user.roles || []).map((role) => role.name);
    const isSuperAdmin = roleNames.includes(ROLE_SUPER_ADMIN);
    const canRevert = Boolean(user.session?.can_revert);

    return (
      <div className="glass rounded-2xl p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-dune/60">Authenticated</p>
        <h3 className="mt-3 font-[var(--font-space)] text-xl">{user.full_name || user.email}</h3>
        <p className="mt-2 text-sm text-dune/70">{user.email}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-dune/70">
          {(user.roles || []).map((roleInfo) => (
            <span key={roleInfo.name} className="rounded-full border border-dune/30 px-3 py-1">
              {roleInfo.name}
            </span>
          ))}
        </div>
        {(isSuperAdmin || canRevert) && (
          <div className="mt-5 rounded-2xl border border-dune/10 bg-midnight/30 p-4">
            <p className="text-[10px] uppercase tracking-[0.25em] text-ember">Role Preview</p>
            {canRevert && (
              <p className="mt-2 text-xs text-dune/60">
                You are currently previewing the <span className="text-ember">{user.session?.switched_role}</span> role.
              </p>
            )}
            {!canRevert && (
              <div className="mt-3 flex gap-2">
                <select
                  value={switchRoleValue}
                  onChange={(event) => setSwitchRoleValue(event.target.value)}
                  className="flex-1 rounded-xl bg-midnight/60 px-3 py-2 text-sm outline-none border border-dune/20"
                >
                  {ROLE_SWITCH_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {roleLabel(role)}
                    </option>
                  ))}
                </select>
                <button
                  onClick={async () => {
                    setBusy(true);
                    setMessage(null);
                    try {
                      await switchRole(switchRoleValue);
                      setMessage(`Now previewing ${roleLabel(switchRoleValue)}.`);
                      router.refresh();
                    } catch (error) {
                      setMessage(error instanceof Error ? error.message : "Failed to switch role");
                    } finally {
                      setBusy(false);
                    }
                  }}
                  disabled={busy}
                  className="rounded-full bg-ember px-4 py-2 text-sm font-semibold text-midnight disabled:opacity-50"
                >
                  {busy ? "Switching..." : "Switch Role"}
                </button>
              </div>
            )}
            {canRevert && (
              <button
                onClick={async () => {
                  setBusy(true);
                  setMessage(null);
                  try {
                    await revertRole();
                    setMessage("Reverted to the original super admin role.");
                    router.refresh();
                  } catch (error) {
                    setMessage(error instanceof Error ? error.message : "Failed to revert role");
                  } finally {
                    setBusy(false);
                  }
                }}
                disabled={busy}
                className="mt-3 rounded-full border border-ember/30 bg-ember/10 px-4 py-2 text-sm font-semibold text-ember disabled:opacity-50"
              >
                {busy ? "Reverting..." : "Revert to Super Admin"}
              </button>
            )}
          </div>
        )}
        <button
          onClick={logout}
          className="mt-6 rounded-full border border-dune/30 px-4 py-2 text-sm"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-[var(--font-space)] text-xl">{mode === "login" ? "Sign In" : "Create Account"}</h3>
        <button
          className="text-xs uppercase tracking-[0.2em] text-ember"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "Need an account?" : "Already have one?"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {mode === "register" && (
          <input
            className="w-full rounded-xl bg-midnight/60 px-4 py-3 text-sm outline-none"
            placeholder="Full name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
        )}
        <input
          type="email"
          className="w-full rounded-xl bg-midnight/60 px-4 py-3 text-sm outline-none"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <input
          type="password"
          className="w-full rounded-xl bg-midnight/60 px-4 py-3 text-sm outline-none"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {mode === "register" && (
          <select
            className="w-full rounded-xl bg-midnight/60 px-4 py-3 text-sm outline-none"
            value={role}
            onChange={(event) => setRole(event.target.value)}
          >
            <option value="instructor">Instructor</option>
            <option value="student">Student</option>
          </select>
        )}
        {mode === "register" && (
          <input
            className="w-full rounded-xl border border-dune/20 bg-midnight/60 px-4 py-3 text-sm outline-none focus:border-ember"
            placeholder="Institution Code (Optional)"
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
        )}
        {message && <p className="text-sm text-ember">{message}</p>}
        <button
          disabled={busy}
          className="w-full rounded-full bg-ember px-4 py-3 text-sm font-semibold text-midnight"
        >
          {busy ? "Working..." : mode === "login" ? "Sign In" : "Create Account"}
        </button>
      </form>

      {/* ─── Google OAuth ─── */}
      <div className="mt-5 flex items-center gap-3">
        <div className="flex-1 h-px bg-dune/10" />
        <span className="text-[10px] uppercase tracking-widest text-dune/40">or</span>
        <div className="flex-1 h-px bg-dune/10" />
      </div>
      <button
        id="google-signin-btn"
        type="button"
        onClick={loginWithGoogle}
        className="mt-4 w-full flex items-center justify-center gap-3 rounded-full border border-dune/20 bg-midnight/40 px-4 py-3 text-sm font-semibold text-dune hover:border-dune/50 hover:bg-midnight/70 transition-all"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Continue with Google
      </button>
    </div>
  );
}

export default function AuthPanel() {
  return (
    <Suspense fallback={<div className="glass rounded-2xl p-6">Loading authentication...</div>}>
      <AuthPanelInner />
    </Suspense>
  );
}
