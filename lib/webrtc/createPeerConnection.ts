export function createPeerConnection(
  iceServersOverride?: RTCIceServer[],
  onTrack?: (event: RTCTrackEvent) => void,
  onIceCandidate?: (event: RTCPeerConnectionIceEvent) => void
) {
  const iceServers = iceServersOverride || [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: process.env.NEXT_PUBLIC_TURN_URL || 'turn:relay.metered.ca:80',
      username: process.env.NEXT_PUBLIC_TURN_USER || '',
      credential: process.env.NEXT_PUBLIC_TURN_PASS || '',
    },
  ];

  const pc = new RTCPeerConnection({
    iceServers,
    iceCandidatePoolSize: 10,
  });

  if (onTrack) {
    pc.ontrack = onTrack;
  }

  if (onIceCandidate) {
    pc.onicecandidate = onIceCandidate;
  }

  return pc;
}
