'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types';
import Avatar from '@/components/ui/Avatar';
import SettingsIcon from '@mui/icons-material/Settings';
import AccountBoxIcon from '@mui/icons-material/AccountBox';
import ImageIcon from '@mui/icons-material/Image';

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (data) {
        const prof = data as Profile;
        setCurrentUser(prof);
        setUsername(prof.username);
        setAvatarUrl(prof.avatar_url || '');
      }
      setLoading(false);
    };

    fetchProfile();
  }, [supabase]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !username.trim()) return;

    setUpdating(true);
    setStatusMessage(null);

    const { error } = await supabase
      .from('profiles')
      .update({
        username: username.trim(),
        avatar_url: avatarUrl.trim() || null,
      })
      .eq('id', currentUser.id);

    if (error) {
      setStatusMessage({ text: error.message, type: 'error' });
    } else {
      setStatusMessage({ text: 'Profile updated successfully!', type: 'success' });
      // Update local profile state
      setCurrentUser((prev) => prev ? { ...prev, username: username.trim(), avatar_url: avatarUrl.trim() || null } : null);
    }
    setUpdating(false);
  };

  if (loading || !currentUser) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900/10">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm font-medium">Loading Settings...</p>
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
            <SettingsIcon />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Settings</h1>
            <p className="text-xs text-slate-500">Configure your TrioCall profile settings</p>
          </div>
        </div>
      </div>

      {/* Main Form content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-2xl">
        {statusMessage && (
          <div
            className={`p-4 rounded-xl border text-sm font-medium transition-all ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-6 bg-slate-900/40 border border-white/[0.06] rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-white/[0.06]">
            <Avatar src={avatarUrl} alt={username} size="xl" />
            <div className="space-y-1 text-center sm:text-left">
              <h2 className="text-lg font-bold text-white">Profile Customization</h2>
              <p className="text-xs text-slate-500">
                Provide a friendly display name and optionally link a web avatar image (e.g. from Unsplash or Dicebear).
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Display Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <AccountBoxIcon fontSize="small" />
                </span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-white/[0.08] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm"
                  placeholder="Your display name"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Avatar URL (Optional)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <ImageIcon fontSize="small" />
                </span>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-white/[0.08] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm"
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={updating || !username.trim()}
              className="py-3 px-6 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-semibold rounded-xl transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 flex items-center justify-center gap-2 disabled:opacity-50 text-sm shadow-lg shadow-indigo-900/20"
            >
              {updating ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
