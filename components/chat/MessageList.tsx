import { useEffect, useRef } from 'react';
import { Message } from '@/types';
import Avatar from '@/components/ui/Avatar';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
}

export default function MessageList({ messages, currentUserId }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 select-text">
      {messages.length === 0 ? (
        <div className="h-full flex items-center justify-center text-slate-500 text-sm font-medium">
          No messages here yet. Say hello!
        </div>
      ) : (
        messages.map((m, index) => {
          const isOwn = m.sender_id === currentUserId;
          const showSenderHeader = index === 0 || messages[index - 1].sender_id !== m.sender_id;

          return (
            <div
              key={m.id}
              className={`flex gap-3 max-w-[85%] ${
                isOwn ? 'ml-auto flex-row-reverse text-right' : 'mr-auto text-left'
              }`}
            >
              {!isOwn && (
                <div className="flex-shrink-0 mt-1">
                  {showSenderHeader ? (
                    <Avatar src={m.sender?.avatar_url} alt={m.sender?.username} size="sm" />
                  ) : (
                    <div className="w-8" />
                  )}
                </div>
              )}

              <div className="space-y-1">
                {!isOwn && showSenderHeader && (
                  <p className="text-xs font-semibold text-indigo-400">
                    {m.sender?.username || 'User'}
                  </p>
                )}
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isOwn
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-none shadow-md shadow-indigo-950/20'
                      : 'bg-slate-800 border border-white/[0.04] text-slate-100 rounded-tl-none shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  <p
                    className={`text-[9px] mt-1 select-none font-medium ${
                      isOwn ? 'text-indigo-200' : 'text-slate-500'
                    }`}
                  >
                    {formatTime(m.created_at)}
                  </p>
                </div>
              </div>
            </div>
          );
        })
      )}
      <div ref={bottomRef} />
    </div>
  );
}
