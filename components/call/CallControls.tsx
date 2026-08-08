import { useCallStore } from '@/lib/store/callStore';
import IconButton from '@/components/ui/IconButton';

import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import CallEndIcon from '@mui/icons-material/CallEnd';

interface CallControlsProps {
  onMuteToggle: () => void;
  onCameraToggle: () => void;
  onScreenShareToggle: () => void;
  onEndCall: () => void;
}

export default function CallControls({
  onMuteToggle,
  onCameraToggle,
  onScreenShareToggle,
  onEndCall,
}: CallControlsProps) {
  const { isMuted, isCamOff, isScreenSharing } = useCallStore();

  return (
    <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-slate-950/80 backdrop-blur-xl border border-white/[0.08] shadow-2xl shadow-slate-950/50 animate-slide-up">
      {/* Microphone toggle */}
      <IconButton
        title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
        onClick={onMuteToggle}
        variant={isMuted ? 'danger' : 'secondary'}
        className="w-12 h-12"
      >
        {isMuted ? <MicOffIcon /> : <MicIcon />}
      </IconButton>

      {/* Camera toggle */}
      <IconButton
        title={isCamOff ? 'Turn Cam On' : 'Turn Cam Off'}
        onClick={onCameraToggle}
        variant={isCamOff ? 'danger' : 'secondary'}
        className="w-12 h-12"
      >
        {isCamOff ? <VideocamOffIcon /> : <VideocamIcon />}
      </IconButton>

      {/* Screen share toggle */}
      <IconButton
        title={isScreenSharing ? 'Stop Presenting' : 'Share Screen'}
        onClick={onScreenShareToggle}
        variant={isScreenSharing ? 'success' : 'secondary'}
        className="w-12 h-12"
      >
        {isScreenSharing ? <StopScreenShareIcon /> : <ScreenShareIcon />}
      </IconButton>

      {/* Separator */}
      <div className="w-px h-8 bg-white/[0.08] mx-1" />

      {/* End call button */}
      <IconButton
        title="Leave Call"
        onClick={onEndCall}
        variant="danger"
        className="w-12 h-12 !bg-rose-600 hover:!bg-rose-500 rounded-xl"
      >
        <CallEndIcon />
      </IconButton>
    </div>
  );
}
