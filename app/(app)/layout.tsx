'use client';

import Sidebar from '@/components/sidebar/Sidebar';
import IncomingCallModal from '@/components/call/IncomingCallModal';
import { useRouter, usePathname } from 'next/navigation';
import { ReactNode, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useCallStore } from '@/lib/store/callStore';
import { MobileSidebarContext } from '@/lib/context/MobileSidebarContext';
import { createClient } from '@/lib/supabase/client';

// Read the mock user cookie reliably (same as client.ts)
function readMockUserId(): string {
  if (typeof document === 'undefined') return '';
  const value = `; ${document.cookie}`;
  const parts = value.split(`; trio_mock_user_id=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || '';
  return '';
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { incomingCall, setIncomingCall } = useCallStore();
  
  // Stable supabase client ref — never recreated
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const openMobileSidebar = useCallback(() => setMobileSidebarOpen(true), []);

  // Auth check — reads cookie directly instead of relying on Supabase session
  useEffect(() => {
    const userId = readMockUserId();
    if (!userId) {
      // No cookie set → go to login
      router.push('/login');
    } else {
      setCurrentUserId(userId);
      setLoading(false);
    }
  }, [router]);

  // Subscribe to incoming call alerts
  useEffect(() => {
    if (!currentUserId) return;

    const channelName = `trio-calls-alerts-${currentUserId.slice(0, 8)}`;
    const globalAlerts = supabase.channel(channelName);

    globalAlerts
      .on('broadcast', { event: 'call-invite' }, ({ payload }) => {
        const isNotMe = payload.startedBy !== currentUserId;
        const isTargeted =
          payload.targetUserId === currentUserId ||
          payload.targetUserId === 'all' ||
          !payload.targetUserId;

        if (isNotMe && isTargeted) {
          setIncomingCall({
            id: payload.roomId,
            roomId: payload.roomId,
            startedBy: payload.startedBy,
            participants: [payload.startedBy, currentUserId],
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(globalAlerts);
    };
  }, [currentUserId, supabase, setIncomingCall]);

  const handleAcceptCall = useCallback(() => {
    if (incomingCall) {
      const destination = `/call/${incomingCall.roomId}`;
      setIncomingCall(null);
      router.push(destination);
    }
  }, [incomingCall, setIncomingCall, router]);

  const handleRejectCall = useCallback(() => {
    if (incomingCall) {
      const alertsChannel = supabase.channel('trio-calls-alerts-reject');
      alertsChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          alertsChannel.send({
            type: 'broadcast',
            event: 'call-declined',
            payload: { roomId: incomingCall.roomId },
          });
        }
      });
      setIncomingCall(null);
    }
  }, [incomingCall, setIncomingCall, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm font-medium tracking-wide">TrioCall is initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <MobileSidebarContext.Provider value={{ openMobileSidebar }}>
      <div className="flex h-screen w-screen overflow-hidden bg-slate-950 select-none relative">
        <Sidebar
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />
        <main className="flex-1 w-full h-full overflow-hidden bg-slate-900/20 relative">
          {children}
        </main>

        {incomingCall && (
          <IncomingCallModal
            startedBy={incomingCall.startedBy}
            roomId={incomingCall.roomId}
            onAccept={handleAcceptCall}
            onReject={handleRejectCall}
          />
        )}
      </div>
    </MobileSidebarContext.Provider>
  );
}
