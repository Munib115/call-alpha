import { createClient } from '../supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export function subscribeToSignaling(
  roomId: string,
  handlers: {
    onOffer: (payload: { sdp: RTCSessionDescriptionInit; from: string; to: string }) => void;
    onAnswer: (payload: { sdp: RTCSessionDescriptionInit; from: string; to: string }) => void;
    onIceCandidate: (payload: { candidate: RTCIceCandidateInit; from: string; to: string }) => void;
    onHangUp: (payload: { from: string }) => void;
  }
): RealtimeChannel {
  const supabase = createClient();
  const channel = supabase.channel(`webrtc-signal:${roomId}`);

  channel
    .on('broadcast', { event: 'offer' }, ({ payload }) => handlers.onOffer(payload))
    .on('broadcast', { event: 'answer' }, ({ payload }) => handlers.onAnswer(payload))
    .on('broadcast', { event: 'ice-candidate' }, ({ payload }) => handlers.onIceCandidate(payload))
    .on('broadcast', { event: 'hang-up' }, ({ payload }) => handlers.onHangUp(payload))
    .subscribe();

  return channel;
}

export async function sendSignal(
  channel: RealtimeChannel,
  event: 'offer' | 'answer' | 'ice-candidate' | 'hang-up',
  payload: unknown
) {
  await channel.send({
    type: 'broadcast',
    event,
    payload,
  });
}
