"use client";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-8">
      <div className="max-w-lg w-full card border-red-800/40">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-white">Something went wrong</h2>
            <p className="text-xs text-gray-500 mt-0.5">Client-side error occurred</p>
          </div>
        </div>

        <div className="bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 mb-4 font-mono text-xs text-red-300 overflow-auto max-h-32">
          {error.message || "Unknown error"}
        </div>

        <div className="flex gap-3">
          <button onClick={reset} className="btn-primary">Try again</button>
          <button onClick={() => window.location.href = "/dashboard"} className="btn-secondary">
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
