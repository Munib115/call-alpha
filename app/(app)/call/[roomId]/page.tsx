'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types';
import { useWebRTC } from '@/components/call/useWebRTC';
import { useCallStore } from '@/lib/store/callStore';
import VideoGrid from '@/components/call/VideoGrid';
import CallControls from '@/components/call/CallControls';

export default function ActiveCallPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const isInitiator = searchParams.get('initiate') === 'true';
  const targetUserId = searchParams.get('to');

  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [callDuration, setCallDuration] = useState(0);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const supabase = createClient();

  const { isMuted, isCamOff, localStream, remoteStreams } = useCallStore();

  // Load profiles
  useEffect(() => {
    const fetchProfiles = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const currentId = session.user.id;

      // Fetch user profiles
      const { data: list } = await supabase.from('profiles').select('*');
      if (list) {
        const cache: Record<string, Profile> = {};
        list.forEach((p) => {
          cache[p.id] = p;
        });
        setProfiles(cache);
        setCurrentUser(cache[currentId]);
      }
    };

    fetchProfiles();
  }, [supabase, router]);

  // Hook up WebRTC functionality
  const { toggleMute, toggleCamera, toggleScreenShare, endCall, participants } = useWebRTC(
    roomId,
    currentUser?.id || ''
  );

  // Set database status to 'in_call' on mount and back to 'online' on unmount
  useEffect(() => {
    if (!currentUser) return;

    const setInCallStatus = async () => {
      await supabase
        .from('profiles')
        .update({ status: 'in_call' })
        .eq('id', currentUser.id);
    };

    setInCallStatus();

    return () => {
      // Revert status to online when leaving call
      const setOnlineStatus = async () => {
        await supabase
          .from('profiles')
          .update({ status: 'online' })
          .eq('id', currentUser.id);
      };
      setOnlineStatus();
    };
  }, [currentUser, supabase]);

  // Create call history log and broadcast alert (only for the initiator)
  useEffect(() => {
    if (!currentUser || !isInitiator || !targetUserId) return;

    const initiateCallAlerts = async () => {
      // 1. Create Call History entry
      // Check if roomId starts with call-, if so we need a valid room ID from database.
      // We will search for a room corresponding to the roomId, or use the pre-seeded trio-main room
      const isGroup = roomId === 'trio-main' || !roomId.startsWith('call-');
      let dbRoomId = 'd223c72b-8a8b-4a5f-9db0-123456789012'; // Default trio-main room ID

      if (!isGroup) {
        // Find matching DM room
        const sortedIds = [currentUser.id, targetUserId].sort();
        const roomName = `dm-${sortedIds[0]}-${sortedIds[1]}`;
        const { data: rm } = await supabase
          .from('rooms')
          .select('id')
          .eq('name', roomName)
          .single();
        if (rm) dbRoomId = rm.id;
      }

      const { data: hist } = await supabase
        .from('call_history')
        .insert({
          room_id: dbRoomId,
          started_by: currentUser.id,
          participants: [currentUser.id, targetUserId],
        })
        .select('id')
        .single();

      if (hist) {
        setHistoryId(hist.id);
      }

      // 2. Broadcast call alert over the global channel
      const globalAlerts = supabase.channel('trio-calls-alerts');
      globalAlerts.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await globalAlerts.send({
            type: 'broadcast',
            event: 'call-invite',
            payload: {
              roomId,
              startedBy: currentUser.id,
              targetUserId,
            },
          });
        }
      });
    };

    initiateCallAlerts();
  }, [currentUser, isInitiator, targetUserId, roomId, supabase]);

  // Update Call History with end timestamp when leaving call
  const handleEndCall = async () => {
    if (historyId) {
      await supabase
        .from('call_history')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', historyId);
    }
    await endCall();
    router.replace('/chat');
  };

  // Call duration counter
  useEffect(() => {
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm">Joining call room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-slate-950 flex flex-col items-center justify-between relative overflow-hidden select-none">
      {/* Background radial highlight */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/5 rounded-full blur-[160px] pointer-events-none" />

      {/* Floating Top Header bar */}
      <div className="w-full max-w-6xl px-6 py-4 flex items-center justify-between z-10">
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Room Session
          </span>
          <span className="text-sm font-bold text-white uppercase tracking-wide">
            {roomId === 'trio-main' ? 'trio-main (Group)' : 'Direct Video Call'}
          </span>
        </div>

        <div className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-md text-sm font-bold text-emerald-400 tabular-nums">
          {formatDuration(callDuration)}
        </div>

        <div className="text-xs font-semibold text-slate-400">
          {participants.length} Participant{participants.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Video Tile Grid */}
      <div className="flex-1 w-full max-w-6xl flex items-center justify-center p-4 z-10 overflow-hidden">
        <VideoGrid
          localStream={localStream}
          remoteStreams={remoteStreams}
          profiles={profiles}
          currentUsername={currentUser.username}
          isLocalMuted={isMuted}
          isLocalCamOff={isCamOff}
        />
      </div>

      {/* Control Actions bar */}
      <div className="w-full max-w-6xl p-6 flex items-center justify-center z-10">
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
