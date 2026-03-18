"use client";

type ToastProps = {
  message: string;
  tone?: "success" | "error";
  onClose?: () => void;
  actionLabel?: string;
  onAction?: () => void;
};

export default function Toast({ message, tone = "success", onClose, actionLabel, onAction }: ToastProps) {
  const toneClass = tone === "success" ? "bg-moss/30 text-moss" : "bg-ember/30 text-ember";

  return (
    <div className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm ${toneClass}`}>
      <span>{message}</span>
      <div className="flex items-center gap-3">
        {actionLabel && onAction && (
          <button onClick={onAction} className="text-xs uppercase tracking-[0.2em]">
            {actionLabel}
          </button>
        )}
        {onClose && (
          <button onClick={onClose} className="text-xs uppercase tracking-[0.2em]">
            Close
          </button>
        )}
      </div>
    </div>
  );
}
