-- Pre-seed Room
INSERT INTO public.rooms (id, name) 
VALUES ('d223c72b-8a8b-4a5f-9db0-123456789012', 'trio-main') 
ON CONFLICT (name) DO NOTHING;

-- Seed Alice, Bob, and Charlie
-- Standard bcrypt hash for 'password123'
DO $$
DECLARE
  alice_id UUID := 'a1111111-1111-1111-1111-111111111111';
  bob_id UUID := 'b2222222-2222-2222-2222-222222222222';
  charlie_id UUID := 'c3333333-3333-3333-3333-333333333333';
  password_hash TEXT := '$2a$10$vI05mXUhyFvO2bS2QxK3mOaR0xG9JvI38g0s.Qn65C3p1dG1.27o2'; -- 'password123'
BEGIN
  -- Alice
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'alice@triocall.com') THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, role, aud, created_at, updated_at)
    VALUES (
      alice_id,
      'alice@triocall.com',
      password_hash,
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"username": "Alice"}',
      'authenticated',
      'authenticated',
      now(),
      now()
    );
    
    INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, email)
    VALUES (
      alice_id::text,
      alice_id,
      jsonb_build_object('sub', alice_id, 'email', 'alice@triocall.com', 'email_verified', true),
      'email',
      now(),
      now(),
      now(),
      'alice@triocall.com'
    );
  END IF;

  -- Bob
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'bob@triocall.com') THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, role, aud, created_at, updated_at)
    VALUES (
      bob_id,
      'bob@triocall.com',
      password_hash,
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"username": "Bob"}',
      'authenticated',
      'authenticated',
      now(),
      now()
    );

    INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, email)
    VALUES (
      bob_id::text,
      bob_id,
      jsonb_build_object('sub', bob_id, 'email', 'bob@triocall.com', 'email_verified', true),
      'email',
      now(),
      now(),
      now(),
      'bob@triocall.com'
    );
  END IF;

  -- Charlie
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'charlie@triocall.com') THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, role, aud, created_at, updated_at)
    VALUES (
      charlie_id,
      'charlie@triocall.com',
      password_hash,
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"username": "Charlie"}',
      'authenticated',
      'authenticated',
      now(),
      now()
    );

    INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, email)
    VALUES (
      charlie_id::text,
      charlie_id,
      jsonb_build_object('sub', charlie_id, 'email', 'charlie@triocall.com', 'email_verified', true),
      'email',
      now(),
      now(),
      now(),
      'charlie@triocall.com'
    );
  END IF;
END $$;
