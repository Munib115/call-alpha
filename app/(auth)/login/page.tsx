'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/ui/Avatar';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import LoginIcon from '@mui/icons-material/Login';
import FaceIcon from '@mui/icons-material/Face';

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'signin'>('profile');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();

  const handleLoginSuccess = (userId: string) => {
    // Set cookie with Secure flag on HTTPS (Vercel) and plain on localhost
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const secureFlag = isHttps ? '; Secure' : '';
    document.cookie = `trio_mock_user_id=${userId}; path=/; max-age=31536000; SameSite=Lax${secureFlag}`;

    // Redirect to chat
    router.push('/chat');
    router.refresh();
  };

  const handleProfileSelect = (username: string) => {
    setLoadingUser(username);
    setError(null);

    const userId = username === 'Haseeb' 
      ? 'a1111111-1111-1111-1111-111111111111'
      : username === 'Ramesha'
      ? 'b2222222-2222-2222-2222-222222222222'
      : 'c3333333-3333-3333-3333-333333333333';

    // Simulate instant login transition
    setTimeout(() => {
      handleLoginSuccess(userId);
    }, 400);
  };

  const handleSignInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const emailLower = email.toLowerCase().trim();

    // Map input emails to seeded user IDs
    let userId = '';
    if (emailLower.includes('haseeb')) {
      userId = 'a1111111-1111-1111-1111-111111111111';
    } else if (emailLower.includes('ramesha')) {
      userId = 'b2222222-2222-2222-2222-222222222222';
    } else if (emailLower.includes('munib') || emailLower.includes('charlie')) {
      userId = 'c3333333-3333-3333-3333-333333333333';
    } else {
      // Default fallback
      userId = 'a1111111-1111-1111-1111-111111111111';
    }

    setTimeout(() => {
      handleLoginSuccess(userId);
    }, 400);
  };

  const profiles = [
    { name: 'Haseeb', avatar: null },
    { name: 'Ramesha', avatar: null },
    { name: 'Munib', avatar: null },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 select-none relative">
      {/* Background decorations */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-2xl flex flex-col items-center">
        {/* Logo Section */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-200 to-emerald-200 bg-clip-text text-transparent">
            TrioCall
          </h1>
          <p className="text-slate-400 mt-2 text-xs font-semibold uppercase tracking-widest">
            3-Person Private calling network
          </p>
        </div>

        {/* Glassmorphic Container */}
        <div className="w-full bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-3xl p-8 shadow-2xl shadow-black/40">
          
          {/* Tabs Selector */}
          <div className="flex gap-2 p-1 bg-slate-950/60 rounded-xl border border-white/[0.04] mb-8">
            <button
              onClick={() => { setActiveTab('profile'); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                activeTab === 'profile'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
              }`}
            >
              <FaceIcon fontSize="small" />
              Quick Profiles
            </button>
            <button
              onClick={() => { setActiveTab('signin'); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                activeTab === 'signin'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
              }`}
            >
              <LoginIcon fontSize="small" />
              Sign In
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm font-medium text-center animate-shake">
              {error}
            </div>
          )}

          {/* Tab 1: Profiles Selection */}
          {activeTab === 'profile' && (
            <div>
              <p className="text-center text-slate-400 text-sm mb-6">
                Select your profile to log in instantly:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {profiles.map((profile) => {
                  const isLoading = loadingUser === profile.name;
                  return (
                    <button
                      key={profile.name}
                      type="button"
                      disabled={loadingUser !== null || loading}
                      onClick={() => handleProfileSelect(profile.name)}
                      className="group flex flex-col items-center gap-4 p-5 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.05] hover:border-indigo-500/30 rounded-2xl transition-all duration-300 shadow-lg disabled:opacity-50 active:scale-[0.98]"
                    >
                      <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-indigo-500/20 opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-300 -m-1" />
                        <div className="relative border-2 border-slate-800 rounded-full">
                          <Avatar src={profile.avatar} alt={profile.name} size="lg" />
                        </div>
                        {isLoading && (
                          <div className="absolute inset-0 bg-slate-950/70 rounded-full flex items-center justify-center border-2 border-slate-800">
                            <span className="w-5 h-5 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        <h3 className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors duration-200">
                          {profile.name}
                        </h3>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                          {profile.name.toLowerCase()}@triocall.com
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 2: Sign In Form */}
          {activeTab === 'signin' && (
            <form onSubmit={handleSignInSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <EmailIcon fontSize="small" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-white/[0.06] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm"
                    placeholder="name@triocall.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <LockIcon fontSize="small" />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-white/[0.06] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-semibold rounded-xl transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 flex items-center justify-center gap-2 disabled:opacity-50 text-sm shadow-lg shadow-indigo-900/20"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LoginIcon fontSize="small" />
                    Sign In
                  </>
                )}
              </button>
            </form>
          )}

        </div>

        <p className="text-[10px] text-slate-600 font-semibold tracking-wider uppercase mt-8">
          Private Invite-Only 3-Person Network
        </p>
      </div>
    </div>
  );
}
