import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.METERED_API_KEY;
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL || 'turn:relay.metered.ca:80';
  const staticUser = process.env.NEXT_PUBLIC_TURN_USER;
  const staticPass = process.env.NEXT_PUBLIC_TURN_PASS;

  // If Metered API Key is provided, fetch fresh credentials dynamically
  if (apiKey) {
    try {
      const response = await fetch(
        `https://triocall.metered.ca/api/v1/turn/credentials?apiKey=${apiKey}`,
        { method: 'GET' }
      );
      if (response.ok) {
        const iceServers = await response.json();
        return NextResponse.json({ iceServers });
      }
    } catch (error) {
      console.error('Error fetching dynamic credentials from Metered.ca:', error);
    }
  }

  // Fallback to static credentials if API fetch fails or API key is not configured
  if (staticUser && staticPass) {
    return NextResponse.json({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        {
          urls: turnUrl,
          username: staticUser,
          credential: staticPass,
        },
      ],
    });
  }

  // Final static STUN fallback if no TURN configs are found
  return NextResponse.json({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  });
}
