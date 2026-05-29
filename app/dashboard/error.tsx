"use client";
import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error.message, error.stack);
  }, [error]);

  return (
    <div className="flex items-center justify-center h-full min-h-[400px] p-8">
      <div className="max-w-md w-full card border-red-800/40">
        <h2 className="font-semibold text-white mb-2">Page error</h2>
        <p className="text-sm text-red-300 font-mono bg-gray-950 rounded px-3 py-2 mb-4 break-all">
          {error.message || "Unknown error"}
        </p>
        <div className="text-xs text-gray-500 mb-4">
          Check browser Console (F12) for full stack trace.
        </div>
        <div className="flex gap-3">
          <button onClick={reset} className="btn-primary text-sm">Retry</button>
          <button onClick={() => window.location.reload()} className="btn-secondary text-sm">Reload</button>
        </div>
      </div>
    </div>
  );
}
