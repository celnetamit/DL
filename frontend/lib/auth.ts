"use client";

import { useCallback, useEffect, useState } from "react";
import { loginUser, registerUser } from "./api";

const TOKEN_KEY = "lms_token";
const USER_KEY = "lms_user";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export type AuthUser = {
  id?: string;
  email?: string;
  full_name?: string;
  roles?: { name: string }[];
  institution_id?: string;
  avatar_url?: string;
};

export function useAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    const storedUser = typeof window !== "undefined" ? window.localStorage.getItem(USER_KEY) : null;
    if (storedToken) {
      setToken(storedToken);
    }
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  const saveSession = useCallback((newToken: string, newUser: AuthUser) => {
    setToken(newToken);
    setUser(newUser);
    window.localStorage.setItem(TOKEN_KEY, newToken);
    window.localStorage.setItem(USER_KEY, JSON.stringify(newUser));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginUser({ email, password });
    saveSession(response.token, response.user);
    return response;
  }, [saveSession]);

  const register = useCallback(
    async (email: string, password: string, fullName: string, role: string, code?: string) => {
      const response = await registerUser({ email, password, full_name: fullName, role, code });
      saveSession(response.token, response.user);
      return response;
    },
    [saveSession],
  );

  /** Redirect the browser to the backend Google OAuth initiation endpoint. */
  const loginWithGoogle = useCallback(() => {
    window.location.href = `${API_URL}/api/v1/auth/google`;
  }, []);

  /**
   * Called by the /auth/callback page after the backend redirects back.
   * Decodes the JWT minimally and fetches the full profile from /users/me.
   */
  const handleGoogleCallback = useCallback(
    async (jwt: string) => {
      try {
        const parts = jwt.split(".");
        if (parts.length !== 3) throw new Error("invalid token");
        const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
        const partialUser: AuthUser = {
          id: payload.sub,
          roles: (payload.roles as string[]).map((r) => ({ name: r })),
        };
        const resp = await fetch(`${API_URL}/api/v1/users/me`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        if (resp.ok) {
          const data = await resp.json();
          saveSession(jwt, data.data ?? partialUser);
        } else {
          saveSession(jwt, partialUser);
        }
      } catch {
        saveSession(jwt, {});
      }
    },
    [saveSession],
  );

  return {
    token,
    user,
    loading,
    login,
    register,
    logout,
    loginWithGoogle,
    handleGoogleCallback,
  };
}
