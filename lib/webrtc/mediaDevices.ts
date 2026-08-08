export async function getLocalUserMedia(
  options: MediaStreamConstraints = { video: true, audio: true }
) {
  try {
    return await navigator.mediaDevices.getUserMedia(options);
  } catch (error) {
    console.error('Error accessing camera/microphone devices:', error);
    throw error;
  }
}

export async function getScreenShareMedia() {
  try {
    return await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });
  } catch (error) {
    console.error('Error accessing screen sharing display:', error);
    throw error;
  }
}
