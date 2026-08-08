'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types';
import { useChatRoom } from '@/components/chat/useChatRoom';
import MessageList from '@/components/chat/MessageList';
import MessageInput from '@/components/chat/MessageInput';
import Avatar from '@/components/ui/Avatar';
import IconButton from '@/components/ui/IconButton';
import VideoCallIcon from '@mui/icons-material/VideoCall';

export default function DMChatPage() {
  const params = useParams();
  const router = useRouter();
  const targetUserId = params.userId as string;
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [targetUser, setTargetUser] = useState<Profile | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchDMRoom = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      
      const currentId = session.user.id;

      // Fetch both user profiles
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentId)
        .single();
      
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (currentProfile) setCurrentUser(currentProfile as Profile);
      if (targetProfile) setTargetUser(targetProfile as Profile);

      if (!targetProfile) {
        setLoadingRoom(false);
        return;
      }

      // Setup deterministic room name based on sorted UUIDs
      const sortedIds = [currentId, targetUserId].sort();
      const roomName = `dm-${sortedIds[0]}-${sortedIds[1]}`;

      // Check if room exists
      let { data: room } = await supabase
        .from('rooms')
        .select('id')
        .eq('name', roomName)
        .single();

      if (!room) {
        // Create a new DM room record dynamically
        const { data: newRoom, error: createError } = await supabase
          .from('rooms')
          .insert({ name: roomName })
          .select('id')
          .single();

        if (newRoom) {
          room = newRoom;
        } else {
          console.error('Error creating DM room:', createError);
        }
      }

      if (room) {
        setRoomId(room.id);
      }
      setLoadingRoom(false);
    };

    fetchDMRoom();

    // Subscribe to target user status changes in real-time
    const targetStatusChannel = supabase
      .channel(`status:${targetUserId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${targetUserId}` },
        (payload) => {
          setTargetUser(payload.new as Profile);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(targetStatusChannel);
    };
  }, [targetUserId, supabase, router]);

  const { messages, sendMessage, loading: chatLoading } = useChatRoom(
    roomId || '',
    currentUser?.id
  );

  const handleStartCall = () => {
    if (!currentUser || !targetUserId) return;
    const sortedIds = [currentUser.id, targetUserId].sort();
    const callRoomId = `call-${sortedIds[0].substring(0, 8)}-${sortedIds[1].substring(0, 8)}`;
    router.push(`/call/${callRoomId}?initiate=true&to=${targetUserId}`);
  };

  if (loadingRoom || chatLoading || !currentUser || !targetUser || !roomId) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900/10">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm font-medium">Opening Direct Message...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900/10">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.06] bg-slate-950/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar src={targetUser.avatar_url} alt={targetUser.username} />
          <div>
            <h1 className="text-base font-bold text-white">{targetUser.username}</h1>
            <p className="text-xs text-slate-500 capitalize">{targetUser.status}</p>
          </div>
        </div>
        <div>
          <IconButton
            title="Start Video Call"
            disabled={targetUser.status === 'offline'}
            onClick={handleStartCall}
            variant="success"
            className="!p-2.5"
          >
            <VideoCallIcon />
          </IconButton>
        </div>
      </div>

      {/* Messages */}
      <MessageList messages={messages} currentUserId={currentUser.id} />

      {/* Input */}
      <MessageInput onSend={sendMessage} />
    </div>
  );
}
