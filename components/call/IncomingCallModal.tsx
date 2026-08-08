import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types';
import Avatar from '@/components/ui/Avatar';
import IconButton from '@/components/ui/IconButton';

import AddIcCallIcon from '@mui/icons-material/AddIcCall';
import CallIcon from '@mui/icons-material/Call';
import CallEndIcon from '@mui/icons-material/CallEnd';

interface IncomingCallModalProps {
  startedBy: string;
  roomId: string;
  onAccept: () => void;
  onReject: () => void;
}

const MOCK_NAMES: Record<string, string> = {
  'a1111111-1111-1111-1111-111111111111': 'Haseeb',
  'b2222222-2222-2222-2222-222222222222': 'Ramesha',
  'c3333333-3333-3333-3333-333333333333': 'Munib',
};

export default function IncomingCallModal({
  startedBy,
  onAccept,
  onReject,
}: IncomingCallModalProps) {
  const [callerProfile, setCallerProfile] = useState<Profile | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // Set immediate fallback so the notification modal displays instantly (0ms delay)
    const fallbackProfile: Profile = {
      id: startedBy,
      username: MOCK_NAMES[startedBy] || 'Incoming Caller',
      status: 'in_call',
      avatar_url: null,
      created_at: new Date().toISOString(),
    };
    setCallerProfile(fallbackProfile);

    const fetchCallerProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', startedBy)
        .maybeSingle();
      
      if (data) {
        setCallerProfile(data as Profile);
      }
    };
    fetchCallerProfile();
  }, [startedBy, supabase]);

  const displayName = callerProfile?.username || MOCK_NAMES[startedBy] || 'Incoming Caller';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md select-none animate-fade-in">
      <div className="w-full max-w-sm bg-slate-900 border border-white/[0.08] shadow-2xl rounded-2xl p-6 flex flex-col items-center text-center gap-6 animate-scale-up">
        {/* Ringing icon animation */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
          <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white border border-indigo-400/20 shadow-lg relative">
            <AddIcCallIcon className="text-2xl" />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-white">Incoming Call</h3>
          <p className="text-sm text-slate-400 mt-1">
            <span className="font-semibold text-indigo-400">{displayName}</span> is inviting you
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Avatar src={callerProfile?.avatar_url} alt={displayName} size="lg" />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-6 mt-2 w-full justify-center">
          <IconButton
            title="Decline Call"
            onClick={onReject}
            variant="danger"
            className="w-14 h-14 !bg-rose-600 hover:!bg-rose-500 rounded-2xl"
          >
            <CallEndIcon className="text-2xl" />
          </IconButton>
          
          <IconButton
            title="Accept Call"
            onClick={onAccept}
            variant="success"
            className="w-14 h-14 !bg-emerald-600 hover:!bg-emerald-500 rounded-2xl"
          >
            <CallIcon className="text-2xl" />
          </IconButton>
        </div>
      </div>
    </div>
  );
}
