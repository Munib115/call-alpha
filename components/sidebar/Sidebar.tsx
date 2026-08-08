'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types';
import { usePresence } from '@/hooks/usePresence';
import Avatar from '@/components/ui/Avatar';
import IconButton from '@/components/ui/IconButton';

import ForumIcon from '@mui/icons-material/Forum';
import ChatIcon from '@mui/icons-material/Chat';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import CloseIcon from '@mui/icons-material/Close';

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  // Track presence using hook
  const onlineUsers = usePresence(currentUser?.id);

  // Fetch current user and all profiles
  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (profile) {
        setCurrentUser(profile as Profile);
      }

      // Fetch all profiles
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('*')
        .order('username', { ascending: true });

      if (allProfiles) {
        setProfiles(allProfiles as Profile[]);
      }
    };

    fetchUserData();

    // Subscribe to profile status updates (unique channel per mount to avoid conflicts)
    const channelId = `profiles-changes-${Math.random().toString(36).slice(2)}`;
    const profilesChannel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          setProfiles((prev) => {
            const updated = payload.new as Profile;
            const idx = prev.findIndex((p) => p.id === updated.id);
            if (idx === -1) {
              return [...prev, updated];
            }
            const next = [...prev];
            next[idx] = updated;
            return next;
          });

          setCurrentUser((prev) => {
            if (prev && prev.id === (payload.new as Profile).id) {
              return payload.new as Profile;
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
    };
  }, [supabase, router]);

  const handleLogout = async () => {
    if (currentUser) {
      await supabase
        .from('profiles')
        .update({ status: 'offline' })
        .eq('id', currentUser.id);
    }
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const getUserStatus = (user: Profile): 'online' | 'offline' | 'in_call' => {
    if (user.status === 'in_call') return 'in_call';
    return onlineUsers[user.id] ? 'online' : 'offline';
  };

  const handleStartCall = (targetUserId: string) => {
    if (!currentUser) return;
    if (onMobileClose) onMobileClose();
    const sortedIds = [currentUser.id, targetUserId].sort();
    const roomId = `call-${sortedIds[0].substring(0,8)}-${sortedIds[1].substring(0,8)}`;
    router.push(`/call/${roomId}?initiate=true&to=${targetUserId}`);
  };

  const navigateTo = (path: string) => {
    if (onMobileClose) onMobileClose();
    router.push(path);
  };

  const SidebarBody = (
    <div className="w-full h-full flex flex-col text-slate-200">
      {/* Header logo / branding */}
      <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-600 flex items-center justify-center font-extrabold text-white text-lg shadow-lg shadow-indigo-950/40">
            T
          </div>
          <div>
            <h2 className="font-extrabold tracking-tight text-white">TrioCall</h2>
            <p className="text-xs text-slate-500 font-medium">3-Person Mesh Calling</p>
          </div>
        </div>

        {/* Mobile close button */}
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-900 border border-white/[0.06]"
          >
            <CloseIcon fontSize="small" />
          </button>
        )}
      </div>

      {/* Main navigation list */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Workspace section */}
        <div>
          <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Workspace
          </h3>
          <div className="space-y-1">
            <button
              onClick={() => navigateTo('/chat')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                pathname === '/chat'
                  ? 'bg-gradient-to-r from-indigo-500/10 to-emerald-500/10 border-l-2 border-indigo-500 text-indigo-200 font-semibold'
                  : 'hover:bg-white/[0.03] text-slate-400 hover:text-slate-200'
              }`}
            >
              <ForumIcon fontSize="small" />
              <span>Group Chat</span>
              <span className="ml-auto text-[10px] bg-slate-800 text-slate-400 py-0.5 px-2 rounded-full border border-white/[0.04]">
                trio-main
              </span>
            </button>
            <button
              onClick={() => navigateTo('/history')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                pathname === '/history'
                  ? 'bg-gradient-to-r from-indigo-500/10 to-emerald-500/10 border-l-2 border-indigo-500 text-indigo-200 font-semibold'
                  : 'hover:bg-white/[0.03] text-slate-400 hover:text-slate-200'
              }`}
            >
              <HistoryIcon fontSize="small" />
              <span>Call History</span>
            </button>
          </div>
        </div>

        {/* Private messages / Users section */}
        <div>
          <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Users
          </h3>
          <div className="space-y-2">
            {profiles
              .filter((p) => p.id !== currentUser?.id)
              .map((p) => {
                const userStatus = getUserStatus(p);
                const dmPath = `/chat/${p.id}`;
                const isSelected = pathname === dmPath;

                return (
                  <div
                    key={p.id}
                    className={`group flex items-center justify-between p-2 rounded-xl transition-all border border-transparent ${
                      isSelected
                        ? 'bg-slate-900/60 border-white/[0.04]'
                        : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <button
                      onClick={() => navigateTo(dmPath)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer touch-manipulation active:opacity-75 transition-opacity"
                    >
                      <Avatar src={p.avatar_url} alt={p.username} status={userStatus} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-200 group-hover:text-white truncate">
                          {p.username}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate capitalize">
                          {userStatus === 'in_call' ? 'in a call' : userStatus}
                        </p>
                      </div>
                    </button>
                    <div className="flex gap-1 items-center">
                      <IconButton
                        title="Chat"
                        onClick={() => navigateTo(dmPath)}
                        className="!p-2"
                      >
                        <ChatIcon className="text-[16px] text-slate-400" />
                      </IconButton>
                      <IconButton
                        title="Video Call"
                        disabled={userStatus === 'offline'}
                        onClick={() => handleStartCall(p.id)}
                        className="!p-2 hover:bg-emerald-500/10"
                      >
                        <VideoCallIcon className="text-[16px] text-emerald-400" />
                      </IconButton>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Footer current user profile card */}
      {currentUser && (
        <div className="p-4 border-t border-white/[0.06] bg-slate-950/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Avatar
              src={currentUser.avatar_url}
              alt={currentUser.username}
              status={getUserStatus(currentUser)}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {currentUser.username}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {currentUser.username.toLowerCase()}@triocall.com
              </p>
            </div>
            <div className="flex gap-0.5">
              <IconButton
                title="Settings"
                onClick={() => navigateTo('/settings')}
                className="!p-2 hover:bg-white/[0.04]"
              >
                <SettingsIcon className="text-[18px] text-slate-400 hover:text-white" />
              </IconButton>
              <IconButton
                title="Sign Out"
                onClick={handleLogout}
                className="!p-2 hover:bg-rose-500/10"
              >
                <LogoutIcon className="text-[18px] text-rose-400 hover:text-rose-300" />
              </IconButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar — Pinned on left for md+ screens */}
      <aside className="hidden md:flex w-80 h-screen flex-shrink-0 bg-slate-950 border-r border-white/[0.06] flex-col text-slate-200">
        {SidebarBody}
      </aside>

      {/* Mobile Drawer Overlay — Slides out over screen on mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity animate-fade-in"
            onClick={onMobileClose}
          />
          <div className="relative w-80 max-w-[85vw] h-full bg-slate-950 border-r border-white/[0.08] flex flex-col z-10 shadow-2xl animate-slide-right">
            {SidebarBody}
          </div>
        </div>
      )}
    </>
  );
}
