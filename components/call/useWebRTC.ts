import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useCallStore } from '@/lib/store/callStore';
import { createPeerConnection } from '@/lib/webrtc/createPeerConnection';
import { sendSignal } from '@/lib/webrtc/signaling';
import { getLocalUserMedia, getScreenShareMedia } from '@/lib/webrtc/mediaDevices';

export function useWebRTC(roomId: string, localUserId: string, callMode: 'video' | 'voice' = 'video') {
  const supabase = createClient();
  
  // Zustand State hooks
  const {
    localStream,
    setLocalStream,
    setRemoteStream,
    removeRemoteStream,
    isMuted,
    isScreenSharing,
    setIsMuted,
    setIsCamOff,
    setIsScreenSharing,
    resetCall,
  } = useCallStore();

  const pcs = useRef<Record<string, RTCPeerConnection>>({});
  const remoteMediaStreams = useRef<Record<string, MediaStream>>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const signalingChannelRef = useRef<RealtimeChannel | null>(null);
  const [participants, setParticipants] = useState<string[]>([]);
  const [iceServers, setIceServers] = useState<RTCIceServer[] | undefined>(undefined);

  // Sync ref with state
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Fetch TURN credentials from server-side route
  useEffect(() => {
    const fetchTurnCreds = async () => {
      try {
        const res = await fetch('/api/turn-creds');
        if (res.ok) {
          const data = await res.json();
          if (data && data.iceServers && data.iceServers.length > 0) {
            setIceServers(data.iceServers);
          }
        }
      } catch (err) {
        console.warn('Dynamic TURN creds fetch error, using default STUN list', err);
      }
    };
    fetchTurnCreds();
  }, []);

  // Helper to start local camera/microphone media stream
  const startLocalStream = useCallback(async (video = true, audio = true) => {
    if (localStreamRef.current) return localStreamRef.current;
    // Voice-only calls skip camera entirely
    const useVideo = callMode === 'video' ? video : false;
    try {
      const stream = await getLocalUserMedia({ video: useVideo, audio });
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.warn('Failed to get local user media stream:', err);
      return null;
    }
  }, [setLocalStream, callMode]);

  // Helper to send ICE candidates
  const handleIceCandidate = useCallback((peerId: string, candidate: RTCIceCandidate) => {
    if (signalingChannelRef.current) {
      sendSignal(signalingChannelRef.current, 'ice-candidate', {
        candidate,
        from: localUserId,
        to: peerId,
      });
    }
  }, [localUserId]);

  // Setup Peer Connection for a specific peer
  const getOrCreatePeerConnection = useCallback((peerId: string, currentLocalStream: MediaStream) => {
    if (pcs.current[peerId]) {
      return pcs.current[peerId];
    }

    const pc = createPeerConnection(
      iceServers,
      (event) => {
        let existingStream = remoteMediaStreams.current[peerId];
        if (!existingStream) {
          existingStream = event.streams && event.streams[0] ? event.streams[0] : new MediaStream();
          remoteMediaStreams.current[peerId] = existingStream;
        }

        if (!existingStream.getTracks().some((t) => t.id === event.track.id)) {
          existingStream.addTrack(event.track);
        }

        // Always create a FRESH MediaStream instance wrapper so Zustand & React detect state change
        const freshStream = new MediaStream(existingStream.getTracks());
        setRemoteStream(peerId, freshStream);
      },
      (event) => {
        if (event.candidate) {
          handleIceCandidate(peerId, event.candidate);
        }
      }
    );

    // Add all local media tracks to this peer connection
    if (currentLocalStream) {
      currentLocalStream.getTracks().forEach((track) => {
        pc.addTrack(track, currentLocalStream);
      });
    }

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Peer ${peerId} state:`, pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        removeRemoteStream(peerId);
        delete remoteMediaStreams.current[peerId];
        pc.close();
        delete pcs.current[peerId];
      }
    };

    pcs.current[peerId] = pc;
    return pc;
  }, [iceServers, handleIceCandidate, setRemoteStream, removeRemoteStream]);

  // Initiate call connection to a peer (send Offer)
  const initiateCallToPeer = useCallback(async (peerId: string) => {
    if (!localUserId || !peerId || peerId === localUserId) return;
    
    let currentStream = localStreamRef.current;
    if (!currentStream) {
      currentStream = await startLocalStream(true, true);
    }
    if (!currentStream) return;

    const pc = getOrCreatePeerConnection(peerId, currentStream);
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      
      if (signalingChannelRef.current) {
        await sendSignal(signalingChannelRef.current, 'offer', {
          sdp: pc.localDescription,
          from: localUserId,
          to: peerId,
        });
      }
    } catch (err) {
      console.error(`Failed to initiate offer to peer ${peerId}`, err);
    }
  }, [getOrCreatePeerConnection, startLocalStream, localUserId]);

  // Handle incoming Offer
  const handleOfferSignal = useCallback(async (payload: { sdp: RTCSessionDescriptionInit; from: string; to: string }) => {
    if (payload.to !== localUserId) return;
    
    let currentStream = localStreamRef.current;
    if (!currentStream) {
      currentStream = await startLocalStream(true, true);
    }
    if (!currentStream) return;

    const pc = getOrCreatePeerConnection(payload.from, currentStream);

    // Resolve Offer Glare / Collision (Simultaneous offers)
    const isOfferCollision = pc.signalingState !== 'stable';
    const isImpolite = localUserId.localeCompare(payload.from) > 0;

    if (isOfferCollision && isImpolite) {
      console.log(`[WebRTC] Ignoring offer from ${payload.from} due to collision (controlling peer)`);
      return;
    }

    try {
      if (isOfferCollision) {
        try {
          await pc.setLocalDescription({ type: 'rollback' } as RTCSessionDescriptionInit);
        } catch (e) {
          console.warn('[WebRTC] Rollback error:', e);
        }
      }

      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (signalingChannelRef.current) {
        await sendSignal(signalingChannelRef.current, 'answer', {
          sdp: pc.localDescription,
          from: localUserId,
          to: payload.from,
        });
      }
    } catch (err) {
      console.error(`Failed to handle offer from ${payload.from}`, err);
    }
  }, [localUserId, getOrCreatePeerConnection, startLocalStream]);

  // Handle incoming Answer
  const handleAnswerSignal = useCallback(async (payload: { sdp: RTCSessionDescriptionInit; from: string; to: string }) => {
    if (payload.to !== localUserId) return;
    const pc = pcs.current[payload.from];
    if (pc) {
      try {
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        }
      } catch (err) {
        console.error(`Error setting remote description answer from ${payload.from}`, err);
      }
    }
  }, [localUserId]);

  // Handle incoming ICE Candidate
  const handleIceCandidateSignal = useCallback(async (payload: { candidate: RTCIceCandidateInit; from: string; to: string }) => {
    if (payload.to !== localUserId) return;
    const pc = pcs.current[payload.from];
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } catch (err) {
        console.error(`Error adding ICE candidate from ${payload.from}`, err);
      }
    }
  }, [localUserId]);

  // Handle peer disconnected / hang up signal
  const handleHangUpSignal = useCallback((payload: { from: string }) => {
    const pc = pcs.current[payload.from];
    if (pc) {
      pc.close();
      delete pcs.current[payload.from];
    }
    delete remoteMediaStreams.current[payload.from];
    removeRemoteStream(payload.from);
  }, [removeRemoteStream]);

  // Mute Toggle Action
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, [setIsMuted]);

  // Camera Toggle Action
  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCamOff(!videoTrack.enabled);
      }
    }
  }, [setIsCamOff]);

  // Screen Share Toggle Action
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      // Stop Screen Share and revert back to camera stream
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
      }
      
      try {
        const camStream = await getLocalUserMedia({ video: true, audio: !isMuted });
        setLocalStream(camStream);

        // Replace video tracks across all active peer connections
        const newVideoTrack = camStream.getVideoTracks()[0];
        Object.values(pcs.current).forEach((pc) => {
          const senders = pc.getSenders();
          const videoSender = senders.find((s) => s.track?.kind === 'video');
          if (videoSender && newVideoTrack) {
            videoSender.replaceTrack(newVideoTrack);
          }
        });

        setIsScreenSharing(false);
      } catch (err) {
        console.error('Failed to revert to camera stream', err);
      }
    } else {
      // Start Screen Share capture
      try {
        const screenStream = await getScreenShareMedia();
        screenStreamRef.current = screenStream;
        const screenVideoTrack = screenStream.getVideoTracks()[0];

        // Replace video tracks across all active peer connections with screen share track
        Object.values(pcs.current).forEach((pc) => {
          const senders = pc.getSenders();
          const videoSender = senders.find((s) => s.track?.kind === 'video');
          if (videoSender && screenVideoTrack) {
            videoSender.replaceTrack(screenVideoTrack);
          } else if (screenVideoTrack) {
            pc.addTrack(screenVideoTrack, screenStream);
          }
        });

        // Combine screen video with current mic audio for local display
        const combinedStream = new MediaStream([
          screenVideoTrack,
          ...(localStreamRef.current ? localStreamRef.current.getAudioTracks() : []),
        ]);
        setLocalStream(combinedStream);
        setIsScreenSharing(true);

        // Revert automatically when user clicks "Stop sharing" in browser banner
        screenVideoTrack.onended = () => {
          toggleScreenShare();
        };
      } catch (err) {
        console.error('Failed to share screen:', err);
      }
    }
  }, [isScreenSharing, isMuted, setLocalStream, setIsScreenSharing]);

  // Final Call Exit / Close
  const endCall = useCallback(async () => {
    if (signalingChannelRef.current) {
      await sendSignal(signalingChannelRef.current, 'hang-up', { from: localUserId });
      supabase.removeChannel(signalingChannelRef.current);
      signalingChannelRef.current = null;
    }

    // Close all peer connections
    Object.keys(pcs.current).forEach((peerId) => {
      pcs.current[peerId].close();
      delete pcs.current[peerId];
    });

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    remoteMediaStreams.current = {};
    resetCall();
  }, [localUserId, resetCall, supabase]);

  // Subscribe to WebRTC signaling channel
  useEffect(() => {
    if (!roomId || !localUserId) return;

    const channel = supabase.channel(`webrtc-signal:${roomId}`);
    signalingChannelRef.current = channel;

    channel
      .on('broadcast', { event: 'offer' }, ({ payload }) => handleOfferSignal(payload))
      .on('broadcast', { event: 'answer' }, ({ payload }) => handleAnswerSignal(payload))
      .on('broadcast', { event: 'ice-candidate' }, ({ payload }) => handleIceCandidateSignal(payload))
      .on('broadcast', { event: 'hang-up' }, ({ payload }) => handleHangUpSignal(payload))
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const activeUsers: string[] = [];

        // Extract item.userId from Supabase presence payloads
        Object.values(presenceState).forEach((presenceList) => {
          (presenceList as Array<{ userId?: string }>).forEach((item) => {
            if (item && item.userId && !activeUsers.includes(item.userId)) {
              activeUsers.push(item.userId);
            }
          });
        });
        
        setParticipants(activeUsers);

        // Initiate call connection to peers (deterministically based on user ID ordering to avoid offer glare)
        activeUsers.forEach((peerId) => {
          if (peerId !== localUserId && !pcs.current[peerId]) {
            if (localUserId.localeCompare(peerId) > 0) {
              initiateCallToPeer(peerId);
            }
          }
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try {
            await startLocalStream(true, true);
          } catch (e) {
            console.warn('[WebRTC] Could not acquire local media stream:', e);
          }
          try {
            await channel.track({
              userId: localUserId,
              joined_at: new Date().toISOString(),
            });
          } catch (e) {
            console.warn('[WebRTC] Presence tracking error:', e);
          }
        }
      });

    return () => {
      endCall();
    };
  }, [
    roomId,
    localUserId,
    supabase,
    handleOfferSignal,
    handleAnswerSignal,
    handleIceCandidateSignal,
    handleHangUpSignal,
    initiateCallToPeer,
    startLocalStream,
    endCall,
  ]);

  return {
    localStream,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    endCall,
    participants,
  };
}
