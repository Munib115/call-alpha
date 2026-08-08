'use client';

import { useMemo, useState } from 'react';
import { useChatRoom } from '@/components/chat/useChatRoom';
import MessageList from '@/components/chat/MessageList';
import MessageInput from '@/components/chat/MessageInput';
import { useMobileSidebar } from '@/lib/context/MobileSidebarContext';
import ForumIcon from '@mui/icons-material/Forum';
import MenuIcon from '@mui/icons-material/Menu';

// Hardcoded mock user map
const MOCK_USERS: Record<string, string> = {
  'a1111111-1111-1111-1111-111111111111': 'Haseeb',
  'b2222222-2222-2222-2222-222222222222': 'Ramesha',
  'c3333333-3333-3333-3333-333333333333': 'Munib',
};

// Hardcoded group room ID
const GROUP_ROOM_ID = 'd223c72b-8a8b-4a5f-9db0-123456789012';

function getMockUserId(): string {
  if (typeof document === 'undefined') return 'a1111111-1111-1111-1111-111111111111';
  const value = `; ${document.cookie}`;
  const parts = value.split(`; trio_mock_user_id=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || 'a1111111-1111-1111-1111-111111111111';
  return 'a1111111-1111-1111-1111-111111111111';
}

export default function GroupChatPage() {
  const { openMobileSidebar } = useMobileSidebar();
  const userId = useMemo(() => getMockUserId(), []);
  const username = MOCK_USERS[userId] || 'User';

  const { messages, sendMessage, loading } = useChatRoom(GROUP_ROOM_ID, userId);

  return (
    <div className="h-full w-full flex flex-col bg-slate-900/10 relative overflow-hidden">
      {/* Header */}
      <div className="px-4 md:px-6 py-3.5 border-b border-white/[0.06] bg-slate-950/40 flex items-center justify-between flex-shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={openMobileSidebar}
            className="md:hidden p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-white/[0.08] active:scale-95 transition-all flex-shrink-0"
            title="Open Menu"
          >
            <MenuIcon fontSize="small" />
          </button>

          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 flex-shrink-0">
            <ForumIcon />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-white truncate">Group Chat</h1>
            <p className="text-xs text-slate-500 truncate hidden sm:block">Shared space with Haseeb, Ramesha, and Munib</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2.5 py-1 bg-indigo-500/10 rounded-lg border border-indigo-500/20 flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-indigo-300">Logged in as {username}</span>
        </div>
      </div>

      {/* Messages area */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-slate-500 text-sm font-medium">Loading messages...</p>
          </div>
        </div>
      ) : (
        <MessageList messages={messages} currentUserId={userId} />
      )}

      {/* Message Input — always visible */}
      <MessageInput onSend={sendMessage} />
    </div>
  );
}
