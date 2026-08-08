import { useEffect, useRef } from 'react';
import MicOffIcon from '@mui/icons-material/MicOff';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';

interface VideoTileProps {
  stream: MediaStream | null;
  username: string;
  isLocal?: boolean;
  isMuted?: boolean;
  isCamOff?: boolean;
  isScreenShare?: boolean;
}

export default function VideoTile({
  stream,
  username,
  isLocal = false,
  isMuted = false,
  isCamOff = false,
  isScreenShare = false,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl && stream) {
      if (videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
      }
      
      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Autoplay prevented or interrupted for media stream:', err);
        });
      }

      const handleTrackChange = () => {
        if (videoEl && stream) {
          videoEl.srcObject = stream;
          videoEl.play().catch(() => {});
        }
      };

      stream.getTracks().forEach((track) => {
        track.addEventListener('unmute', handleTrackChange);
        track.addEventListener('mute', handleTrackChange);
        track.addEventListener('ended', handleTrackChange);
      });

      return () => {
        stream.getTracks().forEach((track) => {
          track.removeEventListener('unmute', handleTrackChange);
          track.removeEventListener('mute', handleTrackChange);
          track.removeEventListener('ended', handleTrackChange);
        });
      };
    }
  }, [stream, isCamOff]);

  const hasVideoTrack = stream && stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled;
  const showVideo = stream && !isCamOff && hasVideoTrack;

  return (
    <div className="relative w-full h-full rounded-2xl bg-slate-950 border border-white/[0.06] overflow-hidden flex items-center justify-center shadow-2xl group transition-all duration-300">
      {/* Video element — ALWAYS mounted so audio tracks play continuously */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal} // Local video is muted to prevent audio feedback loop
        className={`w-full h-full object-cover rounded-2xl transition-opacity duration-300 ${
          showVideo ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
        } ${isLocal && !isScreenShare ? 'scale-x-[-1]' : 'scale-x-1'}`}
      />

      {/* Fallback overlay when video is hidden / camera off */}
      {!showVideo && (
        <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
          <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center border border-white/[0.08] shadow-inner text-indigo-400">
            {isScreenShare ? (
              <ScreenShareIcon className="w-12 h-12" />
            ) : (
              <AccountCircleIcon className="w-16 h-16 text-slate-400" />
            )}
          </div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {isScreenShare ? 'Sharing Screen' : stream ? 'Camera Muted' : 'Connecting Media...'}
          </span>
        </div>
      )}

      {/* Details bar (pinned to bottom) */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none select-none z-10">
        <div className="px-3 py-1.5 rounded-lg bg-slate-950/80 backdrop-blur-md border border-white/[0.08] text-xs font-semibold text-slate-100 flex items-center gap-2 shadow-lg">
          <span>{username}</span>
          {isLocal && <span className="text-[10px] text-indigo-400 font-bold uppercase">(You)</span>}
          {isScreenShare && <span className="text-[10px] text-emerald-400 font-bold uppercase">(Screen)</span>}
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
