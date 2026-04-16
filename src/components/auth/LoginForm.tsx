'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function LoginForm() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOAuthLogin = async (provider: 'google' | 'kakao') => {
    setLoading(provider);
    setError(null);

    const supabase = createClient();

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (authError) {
      setError('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="rounded-lg bg-accent-soft px-4 py-3 text-sm text-accent-text">
          {error}
        </div>
      )}

      {/* Google 로그인 */}
      <button
        type="button"
        onClick={() => handleOAuthLogin('google')}
        disabled={loading !== null}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted-soft disabled:opacity-50"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        {loading === 'google' ? '로그인 중...' : 'Google로 로그인'}
      </button>

      {/* Kakao 로그인 */}
      <button
        type="button"
        onClick={() => handleOAuthLogin('kakao')}
        disabled={loading !== null}
        className="flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 transition-colors hover:brightness-95 disabled:opacity-50"
        style={{ backgroundColor: '#FEE500' }}
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3C6.48 3 2 6.36 2 10.44c0 2.62 1.75 4.93 4.38 6.24l-1.12 4.1a.37.37 0 0 0 .56.4l4.74-3.13c.47.05.95.08 1.44.08 5.52 0 10-3.36 10-7.69C22 6.36 17.52 3 12 3z" />
        </svg>
        {loading === 'kakao' ? '로그인 중...' : '카카오로 로그인'}
      </button>
    </div>
  );
}
