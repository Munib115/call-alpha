import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CallHistory, Profile } from '@/types';

export function useCallHistory(userId: string | undefined) {
  const [history, setHistory] = useState<CallHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const supabase = createClient();

  useEffect(() => {
    if (!userId) return;

    const loadData = async () => {
      // Fetch all user profiles for participant mapping
      const { data: profs } = await supabase.from('profiles').select('*');
      const profileMap: Record<string, Profile> = {};
      if (profs) {
        profs.forEach((p) => {
          profileMap[p.id] = p;
        });
        setProfiles(profileMap);
      }

      // Fetch call history logs
      const { data: logs } = await supabase
        .from('call_history')
        .select('*, room:rooms(name)')
        .contains('participants', [userId])
        .order('started_at', { ascending: false });

      if (logs) {
        setHistory(logs as CallHistory[]);
      }
      setLoading(false);
    };

    loadData();
  }, [userId, supabase]);

  return {
    history,
    profiles,
    loading,
  };
}
