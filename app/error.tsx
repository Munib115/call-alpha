'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled app error caught by boundary:', error);

    const isChunkError =
      error?.message?.includes('ChunkLoadError') ||
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('error loading dynamically imported module');

    if (isChunkError) {
      window.location.reload();
    }
  }, [error]);

  const handleRetry = () => {
    // Attempt resetting error boundary first, fallback to reload
    try {
      reset();
    } catch {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 p-6">
      <div className="flex flex-col items-center gap-5 max-w-sm text-center">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-3xl">
          ⚠️
        </div>
        <div>
          <h2 className="text-xl font-bold text-white mb-2">
            Call Connection Notice
          </h2>
          <p className="text-sm text-slate-400">
            A temporary connection error occurred. Reconnecting to TrioCall...
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRetry}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition-all active:scale-95 touch-manipulation"
          >
            Rejoin Call
          </button>
          <a
            href="/chat"
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-sm transition-all border border-white/[0.06]"
          >
            Return to Chat
          </a>
        </div>
      </div>
    </div>
  );
}
