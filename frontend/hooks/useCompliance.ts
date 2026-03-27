"use client";

import { useState, useEffect } from "react";
import { deleteMyAccount, exportMyData, giveConsent } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export function useCompliance() {
  const { token, user, logout } = useAuth();
  const [consentGiven, setConsentGiven] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");

  useEffect(() => {
    if (typeof user?.consent_given === "boolean") {
      setConsentGiven(user.consent_given);
      if (user.consent_given) {
        localStorage.setItem("dpdp_consent", "true");
      } else {
        localStorage.removeItem("dpdp_consent");
      }
      return;
    }

    const consent = localStorage.getItem("dpdp_consent");
    setConsentGiven(consent === "true");
  }, [user?.consent_given]);

  const acceptConsent = async () => {
    if (!token) {
      setMessage("Please sign in to record your consent.");
      setMessageTone("error");
      return;
    }
    try {
      await giveConsent(token);
      localStorage.setItem("dpdp_consent", "true");
      setConsentGiven(true);
      setMessage("Consent recorded successfully.");
      setMessageTone("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to record consent.");
      setMessageTone("error");
    }
  };

  const exportData = async () => {
    if (!token) {
      setMessage("Please sign in to export your data.");
      setMessageTone("error");
      return;
    }
    try {
      const data = await exportMyData(token);
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
    if (!token) {
      setMessage("Please sign in to delete your account.");
      setMessageTone("error");
      return;
    }
    try {
      await deleteMyAccount(token);
      localStorage.removeItem("dpdp_consent");
      logout();
      window.location.href = "/";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to delete account. Please contact support.");
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
