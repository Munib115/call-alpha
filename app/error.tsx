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
    // Auto-reload on chunk load failures (stale Vercel deployment)
    const isChunkError =
      error?.message?.includes('ChunkLoadError') ||
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('error loading dynamically imported module');

    if (isChunkError) {
      // Hard reload to get fresh chunks from new deployment
      window.location.reload();
    }
  }, [error]);

  const isChunkError =
    error?.message?.includes('ChunkLoadError') ||
    error?.message?.includes('Loading chunk') ||
    error?.message?.includes('Failed to fetch dynamically imported module') ||
    error?.message?.includes('error loading dynamically imported module');

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 p-6">
      <div className="flex flex-col items-center gap-5 max-w-sm text-center">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-3xl">
          {isChunkError ? '🔄' : '⚠️'}
        </div>
        <div>
          <h2 className="text-xl font-bold text-white mb-2">
            {isChunkError ? 'New update available' : 'Something went wrong'}
          </h2>
          <p className="text-sm text-slate-400">
            {isChunkError
              ? 'TrioCall was updated. Reloading to get the latest version...'
              : 'An unexpected error occurred. Please try again.'}
          </p>
        </div>
        <button
          onClick={() => {
            if (isChunkError) {
              window.location.reload();
            } else {
              reset();
            }
          }}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition-all active:scale-95 touch-manipulation"
        >
          {isChunkError ? 'Reload Now' : 'Try Again'}
        </button>
      </div>
    </div>
  );
}
