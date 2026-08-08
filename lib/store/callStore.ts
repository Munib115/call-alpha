import { create } from 'zustand';
import { ActiveCall } from '@/types';

interface CallState {
  activeCall: ActiveCall | null;
  incomingCall: ActiveCall | null;
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  isMuted: boolean;
  isCamOff: boolean;
  isScreenSharing: boolean;
  setActiveCall: (call: ActiveCall | null) => void;
  setIncomingCall: (call: ActiveCall | null) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (peerId: string, stream: MediaStream) => void;
  removeRemoteStream: (peerId: string) => void;
  clearRemoteStreams: () => void;
  setIsMuted: (val: boolean) => void;
  setIsCamOff: (val: boolean) => void;
  setIsScreenSharing: (val: boolean) => void;
  resetCall: () => void;
}

export const useCallStore = create<CallState>((set) => ({
  activeCall: null,
  incomingCall: null,
  localStream: null,
  remoteStreams: {},
  isMuted: false,
  isCamOff: false,
  isScreenSharing: false,
  setActiveCall: (call) => set({ activeCall: call }),
  setIncomingCall: (call) => set({ incomingCall: call }),
  setLocalStream: (stream) => set({ localStream: stream }),
  setRemoteStream: (peerId, stream) =>
    set((state) => ({
      remoteStreams: { ...state.remoteStreams, [peerId]: stream },
    })),
  removeRemoteStream: (peerId) =>
    set((state) => {
      const copy = { ...state.remoteStreams };
      delete copy[peerId];
      return { remoteStreams: copy };
    }),
  clearRemoteStreams: () => set({ remoteStreams: {} }),
  setIsMuted: (val) => set({ isMuted: val }),
  setIsCamOff: (val) => set({ isCamOff: val }),
  setIsScreenSharing: (val) => set({ isScreenSharing: val }),
  resetCall: () =>
    set((state) => {
      // Clean up tracks if any exist to prevent camera indicator remaining active
      if (state.localStream) {
        state.localStream.getTracks().forEach((track) => track.stop());
      }
      Object.values(state.remoteStreams).forEach((stream) => {
        stream.getTracks().forEach((track) => track.stop());
      });
      return {
        activeCall: null,
        incomingCall: null,
        localStream: null,
        remoteStreams: {},
        isMuted: false,
        isCamOff: false,
        isScreenSharing: false,
      };
    }),
}));
