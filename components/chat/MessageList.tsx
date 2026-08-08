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
    <div className="flex-1 overflow-y-auto px-3 py-3 md:px-6 md:py-4 space-y-3 md:space-y-4 select-text">
      {messages.length === 0 ? (
        <div className="h-full flex items-center justify-center text-slate-500 text-xs md:text-sm font-medium">
          No messages here yet. Say hello!
        </div>
      ) : (
        messages.map((m, index) => {
          const isOwn = String(m.sender_id || '').trim().toLowerCase() === String(currentUserId || '').trim().toLowerCase();
          const showSenderHeader = index === 0 || messages[index - 1].sender_id !== m.sender_id;

          return (
            <div
              key={m.id}
              className={`flex gap-2 md:gap-3 max-w-[92%] md:max-w-[85%] ${
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
                  className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isOwn
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-none shadow-md shadow-indigo-950/20'
                      : 'bg-slate-800 border border-white/[0.04] text-slate-100 rounded-tl-none shadow-sm'
                  }`}
                >
                  {/* Media Content Display */}
                  {m.media_url && (
                    <div className="mb-2">
                      {m.type === 'image' || m.media_url.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i) || m.media_url.startsWith('data:image') ? (
                        <img
                          src={m.media_url}
                          alt="Attachment"
                          className="rounded-xl max-w-xs md:max-w-sm max-h-72 object-cover cursor-pointer shadow-md hover:opacity-95 transition-opacity border border-white/[0.1]"
                          onClick={() => window.open(m.media_url || '', '_blank')}
                        />
                      ) : m.type === 'video' || m.media_url.match(/\.(mp4|webm|ogg)($|\?)/i) || m.media_url.startsWith('data:video') ? (
                        <video
                          src={m.media_url}
                          controls
                          className="rounded-xl max-w-xs md:max-w-sm max-h-72 shadow-md border border-white/[0.1]"
                        />
                      ) : m.type === 'audio' || m.media_url.match(/\.(mp3|wav|ogg|m4a|webm)($|\?)/i) || m.media_url.startsWith('data:audio') ? (
                        <div className="py-1">
                          <audio
                            src={m.media_url}
                            controls
                            className="w-56 md:w-64 max-w-full rounded-lg accent-indigo-500"
                          />
                        </div>
                      ) : null}
                    </div>
                  )}

                  {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}

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
