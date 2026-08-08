import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useCallStore } from '@/lib/store/callStore';
import { createPeerConnection } from '@/lib/webrtc/createPeerConnection';
import { sendSignal } from '@/lib/webrtc/signaling';
import { getLocalUserMedia, getScreenShareMedia } from '@/lib/webrtc/mediaDevices';

export function useWebRTC(roomId: string, localUserId: string) {
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
          if (data && data.iceServers) {
            setIceServers(data.iceServers);
          }
        }
      } catch (err) {
        console.error('Could not fetch dynamic TURN creds, falling back to env vars', err);
      }
    };
    fetchTurnCreds();
  }, []);

  // Helper to start the local camera/mic stream
  const startLocalStream = useCallback(async (video = true, audio = true) => {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const stream = await getLocalUserMedia({ video, audio });
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error('Failed to get local stream', err);
      throw err;
    }
  }, [setLocalStream]);

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
        if (event.streams && event.streams[0]) {
          setRemoteStream(peerId, event.streams[0]);
        }
      },
      (event) => {
        if (event.candidate) {
          handleIceCandidate(peerId, event.candidate);
        }
      }
    );

    // Add local tracks to this connection
    currentLocalStream.getTracks().forEach((track) => {
      pc.addTrack(track, currentLocalStream);
    });

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        removeRemoteStream(peerId);
        pc.close();
        delete pcs.current[peerId];
      }
    };

    pcs.current[peerId] = pc;
    return pc;
  }, [iceServers, handleIceCandidate, setRemoteStream, removeRemoteStream]);

  // Initiate call connection to a peer (send Offer)
  const initiateCallToPeer = useCallback(async (peerId: string) => {
    let currentStream = localStreamRef.current;
    if (!currentStream) {
      currentStream = await startLocalStream(true, true);
    }

    const pc = getOrCreatePeerConnection(peerId, currentStream);
    try {
      const offer = await pc.createOffer();
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

    const pc = getOrCreatePeerConnection(payload.from, currentStream);
    try {
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
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
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
      // Stop Screen Share, revert to camera
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
      }
      
      try {
        // Stop current camera tracks
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((t) => t.stop());
        }
        
        const camStream = await getLocalUserMedia({ video: true, audio: !isMuted });
        setLocalStream(camStream);

        // Replace tracks in all peer connections
        const newVideoTrack = camStream.getVideoTracks()[0];
        Object.values(pcs.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (sender && newVideoTrack) {
            sender.replaceTrack(newVideoTrack);
          }
        });

        setIsScreenSharing(false);
      } catch (err) {
        console.error('Failed to revert to camera stream', err);
      }
    } else {
      // Start Screen Share
      try {
        const screenStream = await getScreenShareMedia();
        screenStreamRef.current = screenStream;
        const screenVideoTrack = screenStream.getVideoTracks()[0];

        // Replace tracks in all peer connections
        Object.values(pcs.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (sender && screenVideoTrack) {
            sender.replaceTrack(screenVideoTrack);
          }
        });

        // Update localStream in Zustand to render the screen stream locally
        // Temporarily swap track or combine with audio
        const combinedStream = new MediaStream([
          screenVideoTrack,
          ...(localStreamRef.current ? localStreamRef.current.getAudioTracks() : []),
        ]);
        setLocalStream(combinedStream);
        setIsScreenSharing(true);

        // Revert automatically if user clicks "Stop Sharing" from browser bar
        screenVideoTrack.onended = () => {
          toggleScreenShare();
        };
      } catch (err) {
        console.error('Failed to share screen', err);
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

    // Close all connections
    Object.keys(pcs.current).forEach((peerId) => {
      pcs.current[peerId].close();
      delete pcs.current[peerId];
    });

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    // Reset global state
    resetCall();
  }, [localUserId, resetCall, supabase]);

  // Subscribe to signaling channel on mount or room changes
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
        
        Object.keys(presenceState).forEach((key) => {
          const list = presenceState[key] as unknown[];
          if (list && list.length > 0) {
            activeUsers.push(key);
          }
        });
        
        setParticipants(activeUsers);

        // If I just joined, I need to initiate call to everyone else already present in the room
        activeUsers.forEach((peerId) => {
          if (peerId !== localUserId && !pcs.current[peerId]) {
            // New user initiates to avoid collision
            initiateCallToPeer(peerId);
          }
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Get local stream before tracking presence so we are ready to negotiate
          await startLocalStream(true, true);
          await channel.track({
            userId: localUserId,
            joined_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      // Clean up on component unmount
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
