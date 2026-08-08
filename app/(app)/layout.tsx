'use client';

import Sidebar from '@/components/sidebar/Sidebar';
import IncomingCallModal from '@/components/call/IncomingCallModal';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { useCallStore } from '@/lib/store/callStore';

export default function AppLayout({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const { incomingCall, setIncomingCall } = useCallStore();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setCurrentUserId(session.user.id);
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  // Subscribe to call alerts on mount if authenticated
  useEffect(() => {
    if (!currentUserId) return;

    const globalAlerts = supabase.channel('trio-calls-alerts');
    
    globalAlerts
      .on('broadcast', { event: 'call-invite' }, ({ payload }) => {
        if (payload.targetUserId === currentUserId) {
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

  const handleAcceptCall = () => {
    if (incomingCall) {
      const destination = `/call/${incomingCall.roomId}`;
      setIncomingCall(null);
      router.push(destination);
    }
  };

  const handleRejectCall = () => {
    setIncomingCall(null);
  };

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
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 select-none">
      <Sidebar />
      <main className="flex-1 h-full overflow-hidden bg-slate-900/20 relative">
        {children}
      </main>

      {/* Global calling modal overlay */}
      {incomingCall && (
        <IncomingCallModal
          startedBy={incomingCall.startedBy}
          roomId={incomingCall.roomId}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}
    </div>
  );
}
