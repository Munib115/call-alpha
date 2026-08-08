import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function usePresence(userId: string | undefined) {
  const [onlineUsers, setOnlineUsers] = useState<Record<string, { userId: string; online_at: string }>>({});
  const supabase = createClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    const updatePresenceState = () => {
      const state = channel.presenceState();
      const online: Record<string, { userId: string; online_at: string }> = {};
      
      Object.keys(state).forEach((key) => {
        const presenceList = state[key] as any[];
        if (presenceList && presenceList.length > 0) {
          online[key] = presenceList[0];
        }
      });
      setOnlineUsers(online);
    };

    channel
      .on('presence', { event: 'sync' }, updatePresenceState)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  return onlineUsers;
}
