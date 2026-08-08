export async function getLocalUserMedia(
  options: MediaStreamConstraints = { video: true, audio: true }
) {
  try {
    return await navigator.mediaDevices.getUserMedia(options);
  } catch (error) {
    console.warn('Full video+audio capture failed, trying fallback options:', error);
    // If video capture fails (e.g. no camera plugged in or permission denied), try audio only
    if (options.video) {
      try {
        return await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      } catch (audioErr) {
        console.error('Audio-only capture also failed:', audioErr);
      }
    }
    // If audio capture also failed, try video only
    try {
      return await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    } catch (videoOnlyErr) {
      console.error('Video-only capture failed:', videoOnlyErr);
      throw error;
    }
  }
}

export async function getScreenShareMedia() {
  try {
    return await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });
  } catch (error) {
    console.warn('Display capture with audio failed, retrying display video only:', error);
    try {
      return await navigator.mediaDevices.getDisplayMedia({ video: true });
    } catch (fallbackErr) {
      console.error('Screen share capture failed completely:', fallbackErr);
      throw fallbackErr;
    }
  }
}
