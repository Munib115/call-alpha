import { useEffect, useRef } from 'react';
import MicOffIcon from '@mui/icons-material/MicOff';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

interface VideoTileProps {
  stream: MediaStream | null;
  username: string;
  isLocal?: boolean;
  isMuted?: boolean;
  isCamOff?: boolean;
}

export default function VideoTile({
  stream,
  username,
  isLocal = false,
  isMuted = false,
  isCamOff = false,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative w-full h-full rounded-2xl bg-slate-950 border border-white/[0.06] overflow-hidden flex items-center justify-center shadow-2xl group transition-all duration-300">
      {/* Video element */}
      {stream && !isCamOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal} // Always mute local video element to prevent feedback
          className={`w-full h-full object-cover rounded-2xl ${
            isLocal ? 'scale-x-[-1]' : '' // Mirror local camera stream
          }`}
        />
      ) : (
        /* Fallback avatar overlay when camera is disabled */
        <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center gap-3">
          <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center border border-white/[0.08] shadow-inner text-slate-400">
            <AccountCircleIcon className="w-16 h-16" />
          </div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Camera Off
          </span>
        </div>
      )}

      {/* Details bar (pinned to bottom) */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none select-none">
        <div className="px-3 py-1.5 rounded-lg bg-slate-950/70 backdrop-blur-md border border-white/[0.06] text-xs font-semibold text-slate-100 flex items-center gap-2">
          <span>{username}</span>
          {isLocal && <span className="text-[10px] text-indigo-400 font-bold uppercase">(You)</span>}
        </div>

        {isMuted && (
          <div className="p-2 rounded-lg bg-rose-600/95 text-white border border-rose-500/20 shadow-md">
            <MicOffIcon className="text-[14px]" />
          </div>
        )}
      </div>
    </div>
  );
}
