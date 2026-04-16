'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export function Header() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold text-foreground">
          filmit
        </Link>

        <nav className="flex items-center gap-6">
          <Link
            href="/quests"
            className="text-sm font-medium text-muted hover:text-foreground"
          >
            퀘스트 탐색
          </Link>
          {user ? (
            <>
              <Link
                href="/quests/new"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
              >
                퀘스트 등록
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-muted hover:text-foreground"
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
            >
              로그인
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
