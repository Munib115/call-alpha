'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Chunk load errors = stale Vercel deployment, hard reload to fix
    const isChunkError =
      error?.message?.includes('ChunkLoadError') ||
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('error loading dynamically imported module') ||
      error?.name === 'ChunkLoadError';

    if (isChunkError) {
      // Small delay so user sees the "Updating..." message first
      const t = setTimeout(() => window.location.reload(), 1200);
      return () => clearTimeout(t);
    }
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#0a0f1e', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', color: '#94a3b8', maxWidth: 360, padding: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔄</div>
          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            TrioCall was updated
          </h2>
          <p style={{ fontSize: 14, marginBottom: 24 }}>
            Reloading to get the latest version. This takes just a moment...
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#4f46e5',
              color: '#fff',
              border: 'none',
              padding: '10px 24px',
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Reload Now
          </button>
        </div>
      </body>
    </html>
  );
}
