export function createPeerConnection(
  iceServersOverride?: RTCIceServer[],
  onTrack?: (event: RTCTrackEvent) => void,
  onIceCandidate?: (event: RTCPeerConnectionIceEvent) => void
) {
  const defaultIceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' },
  ];

  // Only include custom TURN server if credentials are explicitly configured
  if (
    process.env.NEXT_PUBLIC_TURN_URL &&
    process.env.NEXT_PUBLIC_TURN_USER &&
    process.env.NEXT_PUBLIC_TURN_PASS
  ) {
    defaultIceServers.push({
      urls: process.env.NEXT_PUBLIC_TURN_URL,
      username: process.env.NEXT_PUBLIC_TURN_USER,
      credential: process.env.NEXT_PUBLIC_TURN_PASS,
    });
  }

  const iceServers =
    iceServersOverride && iceServersOverride.length > 0 ? iceServersOverride : defaultIceServers;

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
