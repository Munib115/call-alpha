-- Clean up existing seeded users first to ensure no partial state exists
DELETE FROM auth.users WHERE email IN ('haseeb@triocall.com', 'ramesha@triocall.com', 'munib@triocall.com');

-- Pre-seed Room
INSERT INTO public.rooms (id, name) 
VALUES ('d223c72b-8a8b-4a5f-9db0-123456789012', 'trio-main') 
ON CONFLICT (name) DO NOTHING;

-- Seed Haseeb, Ramesha, and Munib
-- Standard bcrypt hash for 'password123'
DO $$
DECLARE
  haseeb_id UUID := 'a1111111-1111-1111-1111-111111111111';
  ramesha_id UUID := 'b2222222-2222-2222-2222-222222222222';
  munib_id UUID := 'c3333333-3333-3333-3333-333333333333';
  password_hash TEXT := '$2a$10$vI05mXUhyFvO2bS2QxK3mOaR0xG9JvI38g0s.Qn65C3p1dG1.27o2'; -- 'password123'
BEGIN
  -- Haseeb
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'haseeb@triocall.com') THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, role, aud, created_at, updated_at)
    VALUES (
      haseeb_id,
      'haseeb@triocall.com',
      password_hash,
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"username": "Haseeb"}',
      'authenticated',
      'authenticated',
      now(),
      now()
    );
    
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      haseeb_id,
      haseeb_id,
      jsonb_build_object('sub', haseeb_id, 'email', 'haseeb@triocall.com', 'email_verified', true),
      'email',
      'haseeb@triocall.com',
      now(),
      now(),
      now()
    );
  END IF;

  -- Ramesha
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'ramesha@triocall.com') THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, role, aud, created_at, updated_at)
    VALUES (
      ramesha_id,
      'ramesha@triocall.com',
      password_hash,
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"username": "Ramesha"}',
      'authenticated',
      'authenticated',
      now(),
      now()
    );

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      ramesha_id,
      ramesha_id,
      jsonb_build_object('sub', ramesha_id, 'email', 'ramesha@triocall.com', 'email_verified', true),
      'email',
      'ramesha@triocall.com',
      now(),
      now(),
      now()
    );
  END IF;

  -- Munib
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'munib@triocall.com') THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, role, aud, created_at, updated_at)
    VALUES (
      munib_id,
      'munib@triocall.com',
      password_hash,
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"username": "Munib"}',
      'authenticated',
      'authenticated',
      now(),
      now()
    );

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      munib_id,
      munib_id,
      jsonb_build_object('sub', munib_id, 'email', 'munib@triocall.com', 'email_verified', true),
      'email',
      'munib@triocall.com',
      now(),
      now(),
      now()
    );
  END IF;
END $$;
