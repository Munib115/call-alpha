export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  status: 'online' | 'offline' | 'in_call';
  created_at: string;
}

export interface Room {
  id: string;
  name: string;
  created_at: string;
}

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: Profile;
}

export interface CallHistory {
  id: string;
  room_id: string;
  started_by: string;
  started_at: string;
  ended_at: string | null;
  participants: string[];
  started_by_profile?: Profile;
  room?: Room;
}

export interface ActiveCall {
  id: string;
  roomId: string;
  startedBy: string;
  participants: string[];
}
