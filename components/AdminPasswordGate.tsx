'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Admin Password Gate (V8.1)
//
// Behaviour depends on NEXT_PUBLIC_ADMIN_PASSWORD env var:
//   Set:   Require password to access children. Unlock stored in sessionStorage.
//   Unset: Show an advisory notice but allow immediate access (local testing).
//
// Never blocks localhost access completely — admin can always dismiss and proceed
// if no password is configured.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, FormEvent } from 'react';

const SESSION_KEY = 'admin-unlocked';

interface Props {
  children: React.ReactNode;
}

export default function AdminPasswordGate({ children }: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  /** Prevents hydration mismatch — only render gate UI after client mount */
  const [mounted,  setMounted]  = useState(false);

  // Read from env at mount time (process.env is available on the client for NEXT_PUBLIC_ vars)
  const requiredPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? '';

  useEffect(() => {
    setMounted(true);
    if (!requiredPassword) {
      // No password configured — open access
      setUnlocked(true);
    } else if (sessionStorage.getItem(SESSION_KEY) === 'true') {
      // Already unlocked this session
      setUnlocked(true);
    }
  }, [requiredPassword]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password === requiredPassword) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      setUnlocked(true);
      setError('');
    } else {
      setError('Incorrect password. Please try again.');
      setPassword('');
    }
  }

  // Hydration guard — render nothing server-side or before mount
  if (!mounted) return null;

  // ── Unlocked (or no password required) ───────────────────────────────────
  if (unlocked) return <>{children}</>;

  // ── Password lock screen ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="card max-w-sm w-full p-8 shadow-lg">

        {/* Icon + title */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🔒</div>
          <h1 className="text-xl font-extrabold text-slate-900">Admin Access</h1>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Enter the admin password to access the Lead Manager.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              placeholder="Enter admin password"
              autoFocus
              className={`w-full px-3 py-2.5 text-sm border rounded-lg
                          focus:outline-none focus:ring-2 focus:ring-blue-300
                          ${error ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'}`}
            />
            {error && (
              <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                <span>⚠️</span> {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                       text-white font-bold text-sm rounded-xl transition-colors shadow"
          >
            Unlock →
          </button>
        </form>

        {/* Footer note */}
        <p className="text-xs text-slate-400 text-center mt-5 leading-relaxed">
          Set via{' '}
          <code className="bg-slate-100 px-1 rounded font-mono">NEXT_PUBLIC_ADMIN_PASSWORD</code>
          {' '}in your{' '}
          <code className="bg-slate-100 px-1 rounded font-mono">.env.local</code>
        </p>
      </div>
    </div>
  );
}
