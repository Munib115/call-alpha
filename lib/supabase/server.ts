import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim() || 'https://placeholder.supabase.co';
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim() || 'placeholder-key';

  const client = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Can be ignored if called from Server Component
        }
      },
    },
  });

  // Mock auth for server-side
  const mockAuth = {
    async getSession() {
      const mockUserId = cookieStore.get('trio_mock_user_id')?.value;
      if (!mockUserId) {
        return { data: { session: null }, error: null };
      }

      const email = mockUserId === 'a1111111-1111-1111-1111-111111111111' 
        ? 'haseeb@triocall.com'
        : mockUserId === 'b2222222-2222-2222-2222-222222222222'
        ? 'ramesha@triocall.com'
        : 'munib@triocall.com';
        
      const username = mockUserId === 'a1111111-1111-1111-1111-111111111111' 
        ? 'Haseeb'
        : mockUserId === 'b2222222-2222-2222-2222-222222222222'
        ? 'Ramesha'
        : 'Munib';

      return {
        data: {
          session: {
            user: {
              id: mockUserId,
              email: email,
              user_metadata: { username }
            },
            access_token: 'mock-token',
            expires_at: 9999999999
          }
        },
        error: null
      };
    },

    onAuthStateChange(callback: any) {
      return {
        data: {
          subscription: {
            unsubscribe() {}
          }
        }
      };
    },

    async signOut() {
      cookieStore.delete('trio_mock_user_id');
      return { error: null };
    }
  };

  Object.defineProperty(client, 'auth', {
    get() {
      return mockAuth;
    }
  });

  return client;
}
