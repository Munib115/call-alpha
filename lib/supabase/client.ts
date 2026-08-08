import { createBrowserClient } from '@supabase/ssr';

// Separate real DB client (uses anon key, no fake JWT)
let _dbClient: ReturnType<typeof createBrowserClient> | null = null;

function getDbClient() {
  if (!_dbClient) {
    const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim() || 'https://placeholder.supabase.co';
    const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim() || 'placeholder-key';
    _dbClient = createBrowserClient(url, anonKey);
  }
  return _dbClient;
}

function getMockUserId(): string {
  if (typeof document === 'undefined') return 'a1111111-1111-1111-1111-111111111111';
  const value = `; ${document.cookie}`;
  const parts = value.split(`; trio_mock_user_id=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || 'a1111111-1111-1111-1111-111111111111';
  return 'a1111111-1111-1111-1111-111111111111';
}

const MOCK_USERS: Record<string, { email: string; username: string }> = {
  'a1111111-1111-1111-1111-111111111111': { email: 'haseeb@triocall.com', username: 'Haseeb' },
  'b2222222-2222-2222-2222-222222222222': { email: 'ramesha@triocall.com', username: 'Ramesha' },
  'c3333333-3333-3333-3333-333333333333': { email: 'munib@triocall.com', username: 'Munib' },
};

export function createClient() {
  // Return the real DB client but override auth to return our mock session
  const client = getDbClient();

  const mockAuth = {
    async getSession() {
      const mockUserId = getMockUserId();
      const user = MOCK_USERS[mockUserId];
      if (!mockUserId || !user) {
        return { data: { session: null }, error: null };
      }
      return {
        data: {
          session: {
            user: {
              id: mockUserId,
              email: user.email,
              user_metadata: { username: user.username },
            },
            // No access_token — forces Supabase to use anon key for DB requests
            access_token: null,
            expires_at: 9999999999,
          },
        },
        error: null,
      };
    },

    onAuthStateChange(callback: (event: string, session: unknown) => void) {
      this.getSession().then(({ data: { session } }) => {
        setTimeout(() => callback('INITIAL_SESSION', session), 0);
      });
      return {
        data: {
          subscription: { unsubscribe() {} },
        },
      };
    },

    async signOut() {
      if (typeof document !== 'undefined') {
        document.cookie = 'trio_mock_user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
      }
      return { error: null };
    },
  };

  // Patch auth on the client instance
  try {
    Object.defineProperty(client, 'auth', {
      get() { return mockAuth; },
      configurable: true,
    });
  } catch {
    // Already patched
  }

  return client;
}
