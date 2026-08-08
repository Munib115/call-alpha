import { useState, useRef, useEffect } from 'react';
import SendIcon from '@mui/icons-material/Send';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import IconButton from '@/components/ui/IconButton';

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export default function MessageInput({ onSend, disabled = false }: MessageInputProps) {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text);
    setText('');
  };

  const handleEmojiClick = (emoji: string) => {
    setText((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const emojis = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉', '🚀'];

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 border-t border-white/[0.06] bg-slate-950/40 flex items-center gap-2 relative"
    >
      {/* Emoji Picker Overlay */}
      {showEmojiPicker && (
        <div
          ref={pickerRef}
          className="absolute bottom-16 left-4 bg-slate-900 border border-white/[0.1] rounded-2xl p-3 shadow-2xl flex gap-1.5 z-30 animate-fade-in"
        >
          {emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleEmojiClick(emoji)}
              className="text-lg hover:scale-125 transition-transform active:scale-95 duration-100 p-1"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <IconButton
        title="Emojis"
        disabled={disabled}
        onClick={() => setShowEmojiPicker((prev) => !prev)}
        className="text-slate-400 hover:text-indigo-400"
      >
        <EmojiEmotionsIcon fontSize="small" />
      </IconButton>

      <input
        type="text"
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message..."
        className="flex-1 bg-slate-900/60 border border-white/[0.08] hover:border-white/[0.12] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all text-sm px-4 py-3"
      />

      <IconButton
        type="submit"
        title="Send"
        disabled={!text.trim() || disabled}
        variant="primary"
        className="!p-3 text-white"
      >
        <SendIcon fontSize="small" />
      </IconButton>
    </form>
  );
}
