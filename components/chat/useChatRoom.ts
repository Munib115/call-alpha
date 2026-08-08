import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Message, Profile } from '@/types';

export function useChatRoom(roomId: string, currentUserId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const supabase = createClient();

  useEffect(() => {
    if (!roomId || !currentUserId) return;

    const loadProfiles = async () => {
      const { data } = await supabase.from('profiles').select('*');
      if (data) {
        const cache: Record<string, Profile> = {};
        data.forEach((p) => {
          cache[p.id] = p;
        });
        setProfiles(cache);
      }
    };

    const loadMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (data) {
        setMessages(data as Message[]);
      }
      setLoading(false);
    };

    const init = async () => {
      await loadProfiles();
      await loadMessages();
    };

    init();

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat-room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, currentUserId, supabase]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || !currentUserId) return;

    const { error } = await supabase.from('messages').insert({
      room_id: roomId,
      sender_id: currentUserId,
      content: content.trim(),
    });

    if (error) {
      console.error('Error sending message:', error);
    }
  };

  const messagesWithSenders = messages.map((m) => ({
    ...m,
    sender: profiles[m.sender_id],
  }));

  return {
    messages: messagesWithSenders,
    loading,
    sendMessage,
  };
}
