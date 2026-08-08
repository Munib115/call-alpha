import { useState, useRef, useEffect } from 'react';
import SendIcon from '@mui/icons-material/Send';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@/components/ui/IconButton';

interface MessageInputProps {
  onSend: (content: string, type?: 'text' | 'image' | 'video' | 'audio', mediaUrl?: string) => void;
  disabled?: boolean;
}

export default function MessageInput({ onSend, disabled = false }: MessageInputProps) {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploading, setUploading] = useState(false);

  const pickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || disabled || uploading) return;
    onSend(text, 'text');
    setText('');
  };

  const handleEmojiClick = (emoji: string) => {
    setText((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Handle file selection (Image, Video, Audio)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      let mediaType: 'image' | 'video' | 'audio' = 'image';

      if (file.type.startsWith('image/')) {
        mediaType = 'image';
      } else if (file.type.startsWith('video/')) {
        mediaType = 'video';
      } else if (file.type.startsWith('audio/')) {
        mediaType = 'audio';
      }

      onSend(text.trim(), mediaType, dataUrl);
      setText('');
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.onerror = () => {
      console.error('File reading failed');
      setUploading(false);
    };

    reader.readAsDataURL(file);
  };

  // Start voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access failed for voice note:', err);
    }
  };

  // Stop & Send voice recording
  const stopAndSendRecording = () => {
    if (!mediaRecorderRef.current) return;

    if (timerRef.current) clearInterval(timerRef.current);

    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onload = () => {
        const audioDataUrl = reader.result as string;
        onSend('', 'audio', audioDataUrl);
      };
      reader.readAsDataURL(audioBlob);
    };

    mediaRecorderRef.current.stop();
    setIsRecording(false);
    setRecordingTime(0);
  };

  // Cancel voice recording
  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = () => {};
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setRecordingTime(0);
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const emojis = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉', '🚀'];

  return (
    <form
      onSubmit={handleSubmit}
      className="p-2.5 md:p-4 border-t border-white/[0.06] bg-slate-950/40 flex items-center gap-1.5 md:gap-2 relative w-full"
    >
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*,video/*,audio/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Emoji Picker Overlay */}
      {showEmojiPicker && (
        <div
          ref={pickerRef}
          className="absolute bottom-14 md:bottom-16 left-2 md:left-4 bg-slate-900 border border-white/[0.1] rounded-2xl p-2 md:p-3 shadow-2xl flex gap-1 z-30 animate-fade-in max-w-[90vw] overflow-x-auto"
        >
          {emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleEmojiClick(emoji)}
              className="text-base md:text-lg hover:scale-125 transition-transform active:scale-95 duration-100 p-1"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Active Voice Recording Bar */}
      {isRecording ? (
        <div className="flex-1 flex items-center justify-between bg-slate-900/90 border border-indigo-500/30 rounded-xl px-4 py-2.5 text-white animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-bold tracking-wider text-rose-400">
              Recording Voice Note ({formatTime(recordingTime)})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancelRecording}
              className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
              title="Cancel"
            >
              <DeleteIcon fontSize="small" />
            </button>

            <button
              type="button"
              onClick={stopAndSendRecording}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-md"
            >
              <SendIcon className="text-xs" />
              <span>Send</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* File Attachment Button */}
          <IconButton
            type="button"
            title="Attach Image, Video, or Audio"
            disabled={disabled || uploading}
            onClick={() => fileInputRef.current?.click()}
            className="text-slate-400 hover:text-emerald-400 flex-shrink-0"
          >
            <AttachFileIcon fontSize="small" />
          </IconButton>

          {/* Emoji Picker Button */}
          <IconButton
            type="button"
            title="Emojis"
            disabled={disabled}
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className="text-slate-400 hover:text-indigo-400 flex-shrink-0"
          >
            <EmojiEmotionsIcon fontSize="small" />
          </IconButton>

          {/* Text Input */}
          <input
            type="text"
            value={text}
            disabled={disabled || uploading}
            onChange={(e) => setText(e.target.value)}
            placeholder={uploading ? 'Processing media...' : 'Type a message...'}
            className="flex-1 min-w-0 bg-slate-900/60 border border-white/[0.08] hover:border-white/[0.12] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all text-xs md:text-sm px-3 py-2.5 md:px-4 md:py-3"
          />

          {/* Mic Button / Voice Note */}
          <IconButton
            type="button"
            title="Record Voice Note"
            disabled={disabled || uploading}
            onClick={startRecording}
            className="text-slate-400 hover:text-rose-400 flex-shrink-0"
          >
            <MicIcon fontSize="small" />
          </IconButton>

          {/* Send Button */}
          <IconButton
            type="submit"
            title="Send"
            disabled={!text.trim() || disabled || uploading}
            variant="primary"
            className="!p-3 text-white flex-shrink-0"
          >
            <SendIcon fontSize="small" />
          </IconButton>
        </>
      )}
    </form>
  );
}
