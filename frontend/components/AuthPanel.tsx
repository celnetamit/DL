"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";

export default function AuthPanel() {
  const { token, user, loading, login, register, logout } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("instructor");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "login") {
        await login(email, password);
        setMessage("Logged in successfully.");
      } else {
        await register(email, password, fullName, role, code);
        setMessage("Registered and logged in.");
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
    </div>
  );
}
