'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCallHistory } from '@/hooks/useCallHistory';
import Avatar from '@/components/ui/Avatar';
import HistoryIcon from '@mui/icons-material/History';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

export default function HistoryPage() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserId(session.user.id);
      }
    };
    fetchUser();
  }, [supabase]);

  const { history, profiles, loading } = useCallHistory(currentUserId || undefined);

  // Compute call duration
  const getCallDurationText = (startedAt: string, endedAt: string | null) => {
    if (!endedAt) return 'Ongoing or Incomplete';
    try {
      const diffMs = new Date(endedAt).getTime() - new Date(startedAt).getTime();
      const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
      const mins = Math.floor(diffSecs / 60);
      const secs = diffSecs % 60;

      if (mins === 0) {
        return `${secs}s`;
      }
      return `${mins}m ${secs}s`;
    } catch {
      return 'Unknown';
    }
  };

  // Format date display
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  if (loading || !currentUserId) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900/10">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm font-medium">Loading Call Logs...</p>
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
            <HistoryIcon />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Call History</h1>
            <p className="text-xs text-slate-500">Log of call sessions in TrioCall</p>
          </div>
        </div>
      </div>

      {/* Main content list */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {history.length === 0 ? (
          <div className="h-[200px] flex flex-col items-center justify-center text-slate-500 text-sm font-medium gap-2 border border-dashed border-white/[0.06] rounded-2xl">
            <HistoryIcon fontSize="large" className="text-slate-600" />
            <p>No call logs available yet.</p>
          </div>
        ) : (
          <div className="max-w-4xl space-y-3">
            {history.map((log) => {
              const isGroup = log.room?.name === 'trio-main';
              const duration = getCallDurationText(log.started_at, log.ended_at);

              return (
                <div
                  key={log.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-900/40 hover:bg-slate-900/60 border border-white/[0.06] rounded-2xl gap-4 transition-all"
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`p-3 rounded-xl ${isGroup ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'} flex items-center justify-center flex-shrink-0`}>
                      <VideoCallIcon />
                    </div>
                    
                    <div className="space-y-1">
                      <h3 className="font-bold text-white text-sm">
                        {isGroup ? 'Group Call (trio-main)' : 'Direct Video Call'}
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                        <div className="flex items-center gap-1">
                          <CalendarMonthIcon className="text-[14px]" />
                          <span>{formatDate(log.started_at)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <AccessTimeIcon className="text-[14px]" />
                          <span>Duration: {duration}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Call participants avatar list */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:block">
                      Participants:
                    </span>
                    <div className="flex -space-x-2">
                      {log.participants.map((pid) => {
                        const prof = profiles[pid];
                        if (!prof) return null;
                        return (
                          <div key={pid} className="border-2 border-slate-950 rounded-full">
                            <Avatar src={prof.avatar_url} alt={prof.username} size="sm" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
