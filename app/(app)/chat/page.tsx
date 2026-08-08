'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useChatRoom } from '@/components/chat/useChatRoom';
import MessageList from '@/components/chat/MessageList';
import MessageInput from '@/components/chat/MessageInput';
import ForumIcon from '@mui/icons-material/Forum';

export default function GroupChatPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchRoomAndUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
      }

      // Fetch room id for 'trio-main'
      const { data: room } = await supabase
        .from('rooms')
        .select('id')
        .eq('name', 'trio-main')
        .single();

      if (room) {
        setRoomId(room.id);
      }
    };

    fetchRoomAndUser();
  }, [supabase]);

  const { messages, sendMessage, loading } = useChatRoom(roomId || '', userId || '');

  if (loading || !roomId || !userId) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900/10">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm font-medium">Loading Chat Room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900/10">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.06] bg-slate-950/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <ForumIcon />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Group Chat</h1>
            <p className="text-xs text-slate-500">Shared space with Alice, Bob, and Charlie</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <MessageList messages={messages} currentUserId={userId} />

      {/* Input */}
      <MessageInput onSend={sendMessage} />
    </div>
  );
}
