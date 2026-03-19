"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

export function useCompliance() {
  const [consentGiven, setConsentGiven] = useState<boolean | null>(null);

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
    } catch (error) {
      alert("Failed to export data. Please try again later.");
    }
  };

  const deleteAccount = async () => {
    if (!confirm("Are you sure you want to permanently delete your account? This action cannot be undone and all your progress will be lost.")) {
      return;
    }
    try {
      await apiFetch("/compliance/account", { method: "DELETE" });
      localStorage.removeItem("token");
      window.location.href = "/";
    } catch (error) {
      alert("Failed to delete account. Please contact support.");
    }
  };

  return {
    consentGiven,
    acceptConsent,
    exportData,
    deleteAccount,
  };
}
