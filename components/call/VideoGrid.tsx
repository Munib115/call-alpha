import { Profile } from '@/types';
import VideoTile from './VideoTile';

interface VideoGridProps {
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  profiles: Record<string, Profile>;
  currentUsername: string;
  isLocalMuted: boolean;
  isLocalCamOff: boolean;
}

export default function VideoGrid({
  localStream,
  remoteStreams,
  profiles,
  currentUsername,
  isLocalMuted,
  isLocalCamOff,
}: VideoGridProps) {
  const remoteEntries = Object.entries(remoteStreams);
  const totalStreams = 1 + remoteEntries.length;

  // Determine grid layout CSS based on participants
  const getGridLayoutClass = () => {
    if (totalStreams === 1) return 'grid-cols-1';
    if (totalStreams === 2) return 'grid-cols-1 md:grid-cols-2';
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
  };

  return (
    <div className={`grid gap-4 w-full h-full p-4 ${getGridLayoutClass()} transition-all duration-500`}>
      {/* Local Participant Tile */}
      <VideoTile
        stream={localStream}
        username={currentUsername}
        isLocal
        isMuted={isLocalMuted}
        isCamOff={isLocalCamOff}
      />

      {/* Remote Participants Tiles */}
      {remoteEntries.map(([peerId, stream]) => {
        const peerProfile = profiles[peerId];
        const peerUsername = peerProfile?.username || 'Guest User';
        const isPeerMuted = peerProfile?.status === 'offline'; // optional additional status check

        return (
          <VideoTile
            key={peerId}
            stream={stream}
            username={peerUsername}
            isLocal={false}
            isMuted={isPeerMuted}
            isCamOff={false} // status managed via signaling or stream tracks
          />
        );
      })}
    </div>
  );
}
