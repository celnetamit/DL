"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

export function useCompliance() {
  const [consentGiven, setConsentGiven] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");

  useEffect(() => {
    const consent = localStorage.getItem("dpdp_consent");
    setConsentGiven(consent === "true");
  }, []);

  const acceptConsent = async () => {
    try {
      await apiFetch("/compliance/consent", { method: "POST" });
      localStorage.setItem("dpdp_consent", "true");
      setConsentGiven(true);
    } catch (error) {
      console.error("Failed to record consent:", error);
      // Fallback: still set local storage so banner disappears
      localStorage.setItem("dpdp_consent", "true");
      setConsentGiven(true);
    }
  };

  const exportData = async () => {
    try {
      const data = await apiFetch("/compliance/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `my-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      setMessage("Your data export has been prepared and downloaded.");
      setMessageTone("success");
    } catch (error) {
      setMessage("Failed to export data. Please try again later.");
      setMessageTone("error");
    }
  };

  const deleteAccount = async () => {
    try {
      await apiFetch("/compliance/account", { method: "DELETE" });
      localStorage.removeItem("token");
      window.location.href = "/";
    } catch (error) {
      setMessage("Failed to delete account. Please contact support.");
      setMessageTone("error");
    }
  };

  return {
    consentGiven,
    acceptConsent,
    exportData,
    deleteAccount,
    message,
    messageTone,
    clearMessage: () => setMessage(null),
  };
}
