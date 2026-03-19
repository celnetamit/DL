"use client";

export const dynamic = "force-dynamic";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";

function CallbackInner() {
  const { handleGoogleCallback } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      // No token – something went wrong; redirect to home
      router.replace("/");
      return;
    }
    handleGoogleCallback(token).then(() => {
      router.replace("/dashboard");
    });
  }, [searchParams, handleGoogleCallback, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 rounded-full border-2 border-ember border-t-transparent animate-spin" />
      <p className="text-sm text-dune/60 uppercase tracking-widest font-semibold animate-pulse">
        Signing you in…
      </p>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense>
      <CallbackInner />
    </Suspense>
  );
}
