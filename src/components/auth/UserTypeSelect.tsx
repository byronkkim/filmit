'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { UserType } from '@/types/database';

interface UserTypeOption {
  type: UserType;
  label: string;
  icon: string;
  description: string;
}

const USER_TYPE_OPTIONS: UserTypeOption[] = [
  {
    type: 'viewer',
    label: '시청자',
    icon: '👀',
    description: '보고 싶은 영상 주제를 요청하고, 소액 후원으로 크리에이터를 응원하세요.',
  },
  {
    type: 'advertiser',
    label: '광고주',
    icon: '📢',
    description: '브랜드에 맞는 영상 제작을 의뢰하고, 원하는 크리에이터를 선택하세요.',
  },
  {
    type: 'creator',
    label: '크리에이터',
    icon: '🎬',
    description: '퀘스트에 도전하여 영상을 제작하고, 보상을 받으세요. 영상 저작권은 100% 본인 소유!',
  },
];

export function UserTypeSelect() {
  const router = useRouter();
  const [selected, setSelected] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = async (userType: UserType) => {
    setSelected(userType);
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError('로그인 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
        setLoading(false);
        return;
      }

      const displayName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        '사용자';

      const { error: insertError } = await supabase.from('users').insert({
        id: user.id,
        email: user.email!,
        user_type: userType,
        display_name: displayName,
        avatar_url: user.user_metadata?.avatar_url || null,
      });

      if (insertError) {
        if (insertError.code === '23505') {
          router.push('/');
          return;
        }
        setError('회원가입 중 오류가 발생했습니다. 다시 시도해주세요.');
        setLoading(false);
        return;
      }

      switch (userType) {
        case 'creator':
          router.push('/creator');
          break;
        case 'advertiser':
          router.push('/advertiser');
          break;
        default:
          router.push('/');
      }
    } catch {
      setError('예기치 않은 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg bg-accent-soft px-4 py-3 text-sm text-accent-text">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {USER_TYPE_OPTIONS.map((option) => (
          <button
            key={option.type}
            type="button"
            onClick={() => handleSelect(option.type)}
            disabled={loading}
            className={`group relative flex flex-col items-center rounded-xl border-2 p-6 text-center transition-all hover:shadow-md disabled:opacity-50 ${
              selected === option.type
                ? 'border-primary bg-primary-soft'
                : 'border-border bg-surface hover:border-primary/40'
            }`}
          >
            {loading && selected === option.type && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-surface/60">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
              </div>
            )}
            <span className="text-3xl">{option.icon}</span>
            <h3 className="mt-3 text-base font-semibold text-foreground">
              {option.label}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              {option.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
