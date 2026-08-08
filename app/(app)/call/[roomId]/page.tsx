'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types';
import { useWebRTC } from '@/components/call/useWebRTC';
import { useCallStore } from '@/lib/store/callStore';
import VideoGrid from '@/components/call/VideoGrid';
import CallControls from '@/components/call/CallControls';
import AddIcCallIcon from '@mui/icons-material/AddIcCall';
import CallEndIcon from '@mui/icons-material/CallEnd';
import CallIcon from '@mui/icons-material/Call';

const MOCK_NAMES: Record<string, string> = {
  'a1111111-1111-1111-1111-111111111111': 'Haseeb',
  'b2222222-2222-2222-2222-222222222222': 'Ramesha',
  'c3333333-3333-3333-3333-333333333333': 'Munib',
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function readMockUserId(): string {
  if (typeof document === 'undefined') return '';
  const value = `; ${document.cookie}`;
  const parts = value.split(`; trio_mock_user_id=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || '';
  return '';
}

function CallRoomContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = (params.roomId as string) || 'call-default';
  const isInitiator = searchParams.get('initiate') === 'true';
  const targetUserId = searchParams.get('to');
  const callMode = (searchParams.get('mode') || 'video') as 'video' | 'voice';

  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [callDuration, setCallDuration] = useState(0);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [callStatusText, setCallStatusText] = useState<string | null>(null);
  const supabase = createClient();

  const { isMuted, isCamOff, localStream, remoteStreams } = useCallStore();

  // Load profiles with instant fallback
  useEffect(() => {
    const fetchProfiles = async () => {
      const cookieUserId = readMockUserId();
      const { data: { session } } = await supabase.auth.getSession();
      const currentId = cookieUserId || session?.user?.id || 'a1111111-1111-1111-1111-111111111111';

      // Fetch user profiles
      const { data: list } = await supabase.from('profiles').select('*');
      const cache: Record<string, Profile> = {};
      if (list && list.length > 0) {
        list.forEach((p) => {
          cache[p.id] = p;
        });
      }

      setProfiles(cache);

      const userProfile: Profile = cache[currentId] || {
        id: currentId,
        username: MOCK_NAMES[currentId] || session?.user?.user_metadata?.username || 'User',
        status: 'in_call',
        avatar_url: null,
        created_at: new Date().toISOString(),
      };

      setCurrentUser(userProfile);
    };

    fetchProfiles();
  }, [supabase, router]);

  // Hook up WebRTC functionality
  const { toggleMute, toggleCamera, toggleScreenShare, endCall, participants } = useWebRTC(
    roomId,
    currentUser?.id || '',
    callMode
  );

  // Set database status to 'in_call' on mount and back to 'online' on unmount
  useEffect(() => {
    if (!currentUser) return;

    const setStatus = async (status: 'in_call' | 'online') => {
      await supabase
        .from('profiles')
        .update({ status })
        .eq('id', currentUser.id);
    };

    setStatus('in_call');

    return () => {
      setStatus('online');
    };
  }, [currentUser, supabase]);

  // Broadcast call invite and listen for decline events if initiator
  useEffect(() => {
    if (!currentUser || !isInitiator) return;

    const globalAlerts = supabase.channel('trio-calls-alerts');
    globalAlerts.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await globalAlerts.send({
          type: 'broadcast',
          event: 'call-invite',
          payload: {
            roomId,
            startedBy: currentUser.id,
            targetUserId: targetUserId || 'all',
          },
        });
      }
    });

    // Listen for call decline response
    const declineSub = globalAlerts.on('broadcast', { event: 'call-declined' }, ({ payload }) => {
      if (payload.roomId === roomId) {
        setCallStatusText('Call Declined');
        setTimeout(() => {
          endCall();
          router.push('/chat');
        }, 2000);
      }
    });

    return () => {
      supabase.removeChannel(globalAlerts);
    };
  }, [currentUser, isInitiator, roomId, targetUserId, supabase, endCall, router]);

  // Record call history row when call starts
  useEffect(() => {
    if (!currentUser || !isInitiator || historyId) return;

    const recordCallStart = async () => {
      const { data } = await supabase
        .from('call_history')
        .insert({
          room_id: roomId,
          started_by: currentUser.id,
          started_at: new Date().toISOString(),
          participants: [currentUser.id],
        })
        .select('*')
        .single();

      if (data) {
        setHistoryId(data.id);
      }
    };

    recordCallStart();
  }, [currentUser, isInitiator, historyId, roomId, supabase]);

  // Call duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleEndCall = useCallback(async () => {
    if (historyId) {
      await supabase
        .from('call_history')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', historyId);
    }
    await endCall();
    router.push('/chat');
  }, [historyId, endCall, router, supabase]);

  const targetName = targetUserId && MOCK_NAMES[targetUserId] ? MOCK_NAMES[targetUserId] : 'Participant';
  const isWaitingForPeer = isInitiator && Object.keys(remoteStreams).length === 0;

  return (
    <div className="h-full w-full bg-slate-950 flex flex-col relative overflow-hidden select-none">
      {/* Background radial highlight */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/5 rounded-full blur-[160px] pointer-events-none" />

      {/* Outgoing Calling / Ringing Floating Banner */}
      {isWaitingForPeer && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-slate-900/90 border border-indigo-500/30 shadow-2xl backdrop-blur-md rounded-2xl px-6 py-4 flex items-center gap-4 animate-bounce">
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 rounded-full bg-indigo-500/30 animate-ping" />
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white relative">
              <AddIcCallIcon className="text-xl" />
            </div>
          </div>

          <div className="flex flex-col">
            <h3 className="text-sm font-bold text-white">
              {callStatusText || `Calling ${targetName}...`}
            </h3>
            <p className="text-xs text-slate-400">
              {callStatusText ? 'Returning to chat...' : `Ringing... waiting for ${targetName} to answer`}
            </p>
          </div>

          {!callStatusText && (
            <button
              onClick={handleEndCall}
              className="ml-2 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1 shadow-md transition-all active:scale-95"
            >
              <CallEndIcon className="text-sm" />
              <span>Cancel</span>
            </button>
          )}
        </div>
      )}

      {/* Main Content: Video Grid or Voice-Only UI */}
      <div className="flex-1 p-4 md:p-6 overflow-hidden flex items-center justify-center z-10">
        {callMode === 'voice' ? (
          /* Voice-Only Call UI */
          <div className="flex flex-col items-center justify-center gap-6 text-center">
            {/* Ripple animation rings */}
            <div className="relative flex items-center justify-center">
              <div className="absolute w-40 h-40 rounded-full bg-indigo-500/10 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="absolute w-56 h-56 rounded-full bg-indigo-500/5 animate-ping" style={{ animationDuration: '2.5s' }} />
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-800 shadow-2xl shadow-indigo-900/60 flex items-center justify-center relative z-10">
                <CallIcon className="text-white" style={{ fontSize: '3rem' }} />
              </div>
            </div>
            <div>
              <p className="text-white text-xl font-bold mb-1">
                {isWaitingForPeer ? `Calling ${targetName}...` : `Voice Call with ${targetName}`}
              </p>
              <p className="text-slate-400 text-sm">{formatDuration(callDuration)}</p>
            </div>
            {/* Connected peers */}
            {!isWaitingForPeer && (
              <div className="flex gap-3 mt-2">
                {Object.keys(remoteStreams).map((peerId) => {
                  const peer = profiles[peerId];
                  return (
                    <div key={peerId} className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-emerald-600/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 font-bold">
                        {peer?.username?.[0]?.toUpperCase() || '?'}
                      </div>
                      <span className="text-xs text-slate-400">{peer?.username || peerId.slice(0,8)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <VideoGrid
            localStream={localStream}
            remoteStreams={remoteStreams}
            currentUsername={currentUser?.username || 'You'}
            profiles={profiles}
            isLocalMuted={isMuted}
            isLocalCamOff={isCamOff}
          />
        )}
      </div>

      {/* Fixed Bottom Call Controls Bar */}
      <div className="z-20">
        <CallControls
          onMuteToggle={toggleMute}
          onCameraToggle={toggleCamera}
          onScreenShareToggle={toggleScreenShare}
          onEndCall={handleEndCall}
        />
      </div>
    </div>
  );
}

export default function ActiveCallPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center bg-slate-950 text-slate-400">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-sm font-medium tracking-wide">Connecting to call room...</p>
          </div>
        </div>
      }
    >
      <CallRoomContent />
    </Suspense>
  );
}
