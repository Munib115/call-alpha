import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Message, Profile } from '@/types';
import { RealtimeChannel } from '@supabase/supabase-js';

// Hardcoded mock user names map
const MOCK_USERNAMES: Record<string, string> = {
  'a1111111-1111-1111-1111-111111111111': 'Haseeb',
  'b2222222-2222-2222-2222-222222222222': 'Ramesha',
  'c3333333-3333-3333-3333-333333333333': 'Munib',
};

export function useChatRoom(roomId: string, currentUserId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = createClient();

  // Deduplicated message append by ID
  const appendMessage = useCallback((newMsg: Message) => {
    if (!newMsg || !newMsg.id) return;
    setMessages((prev) => {
      // Check strict ID match or content match from same sender within 2 seconds
      const exists = prev.some(
        (m) =>
          m.id === newMsg.id ||
          (m.content === newMsg.content &&
            m.sender_id === newMsg.sender_id &&
            Math.abs(new Date(m.created_at).getTime() - new Date(newMsg.created_at).getTime()) < 2000)
      );
      if (exists) return prev;
      return [...prev, newMsg].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!roomId) return;
    const { data: msgData } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (msgData) {
      setMessages((prev) => {
        const map = new Map<string, Message>();
        prev.forEach((m) => map.set(m.id, m));
        (msgData as Message[]).forEach((m) => map.set(m.id, m));
        return Array.from(map.values()).sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });
    }
  }, [roomId, supabase]);

  useEffect(() => {
    if (!roomId) return;

    const loadData = async () => {
      // 1. Fetch user profiles
      const { data: profData } = await supabase.from('profiles').select('*');
      if (profData && profData.length > 0) {
        const cache: Record<string, Profile> = {};
        profData.forEach((p) => {
          cache[p.id] = p;
        });
        setProfiles(cache);
      }

      // 2. Initial fetch of room messages
      await fetchMessages();
      setLoading(false);
    };

    loadData();

    // 3. Realtime Channel setup: combining postgres_changes + websocket broadcast
    const channel = supabase.channel(`chat-room-${roomId}`);
    channelRef.current = channel;

    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          appendMessage(payload.new as Message);
        }
      )
      .on('broadcast', { event: 'new-message' }, ({ payload }) => {
        if (payload && payload.room_id === roomId) {
          appendMessage(payload as Message);
        }
      })
      .subscribe();

    // 4. Background auto-polling fallback (every 3 seconds)
    const interval = setInterval(() => {
      fetchMessages();
    }, 3000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [roomId, supabase, fetchMessages, appendMessage]);

  const sendMessage = useCallback(
    async (content: string, type: 'text' | 'image' | 'video' | 'audio' = 'text', mediaUrl?: string) => {
      if ((!content.trim() && !mediaUrl) || !currentUserId || !roomId) return;

      const trimmed = content.trim();

      // Insert directly into database to obtain canonical DB record ID
      const { data: insertedMsg, error } = await supabase
        .from('messages')
        .insert({
          room_id: roomId,
          sender_id: currentUserId,
          content: trimmed || (type === 'image' ? '📷 Photo' : type === 'video' ? '📹 Video' : '🎙️ Voice Message'),
          type,
          media_url: mediaUrl || null,
        })
        .select('*')
        .single();

      if (insertedMsg) {
        const realMsg = insertedMsg as Message;
        // 1. Append DB record to local state
        appendMessage(realMsg);

        // 2. Broadcast DB record via WebSocket to other open tabs
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'new-message',
            payload: realMsg,
          });
        }
      } else if (error) {
        console.error('Error inserting message:', error.message);
      }
    },
    [roomId, currentUserId, supabase, appendMessage]
  );

  // Enrich messages with sender display name
  const messagesWithSenders = messages.map((m) => ({
    ...m,
    sender: profiles[m.sender_id] || {
      id: m.sender_id,
      username: MOCK_USERNAMES[m.sender_id] || 'User',
      status: 'online',
    },
  }));

  return {
    messages: messagesWithSenders,
    loading,
    sendMessage,
  };
}
