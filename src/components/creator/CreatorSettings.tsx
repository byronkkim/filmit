'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Creator } from '@/types/database';
import { CreatorKYC } from './CreatorKYC';

interface ChannelInfo {
  channel_id: string;
  channel_name: string;
  subscriber_count: number;
  categories: string[];
  thumbnail_url: string;
  description: string;
}

const BANKS = [
  { code: '004', name: 'KB국민은행' },
  { code: '088', name: '신한은행' },
  { code: '020', name: '우리은행' },
  { code: '081', name: '하나은행' },
  { code: '011', name: 'NH농협은행' },
  { code: '023', name: 'SC제일은행' },
  { code: '027', name: '씨티은행' },
  { code: '071', name: '우체국' },
  { code: '031', name: '대구은행' },
  { code: '032', name: '부산은행' },
  { code: '034', name: '광주은행' },
  { code: '035', name: '제주은행' },
  { code: '037', name: '전북은행' },
  { code: '039', name: '경남은행' },
  { code: '089', name: '케이뱅크' },
  { code: '090', name: '카카오뱅크' },
  { code: '092', name: '토스뱅크' },
];

const GRADE_LABEL: Record<string, string> = {
  bronze: '브론즈',
  silver: '실버',
  gold: '골드',
  platinum: '플래티넘',
};

interface CreatorSettingsProps {
  creator: Creator;
}

export function CreatorSettings({ creator }: CreatorSettingsProps) {
  const router = useRouter();

  // 채널 정보
  const [channelUrl, setChannelUrl] = useState(creator.channel_url);
  const [channelName, setChannelName] = useState(creator.channel_name ?? '');
  const [channelInfo, setChannelInfo] = useState<ChannelInfo | null>(null);
  const [channelLoading, setChannelLoading] = useState(false);
  const [channelError, setChannelError] = useState<string | null>(null);

  // 정산 계좌
  const [bankCode, setBankCode] = useState(creator.bank_code ?? '');
  const [accountNumber, setAccountNumber] = useState(creator.account_number ?? '');
  const [accountHolder, setAccountHolder] = useState(creator.account_holder ?? '');

  // 저장 상태
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchChannel = useCallback(async (url: string) => {
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) return;

    setChannelLoading(true);
    setChannelError(null);
    setChannelInfo(null);

    try {
      const res = await fetch(`/api/creators/youtube?url=${encodeURIComponent(url)}`);
      const data = await res.json();

      if (!res.ok) {
        setChannelError(data.error ?? '채널 정보를 가져올 수 없습니다.');
        return;
      }

      const info: ChannelInfo = data.channel;
      setChannelInfo(info);
      setChannelName(info.channel_name);
    } catch {
      setChannelError('채널 정보를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setChannelLoading(false);
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const body: Record<string, unknown> = {
        channel_url: channelUrl,
        channel_name: channelName || null,
        bank_code: bankCode || null,
        account_number: accountNumber || null,
        account_holder: accountHolder || null,
      };

      // YouTube 연동 데이터가 있으면 함께 저장
      if (channelInfo) {
        body.channel_id = channelInfo.channel_id;
        body.subscriber_count = channelInfo.subscriber_count;
        body.categories = channelInfo.categories;
      }

      const res = await fetch('/api/creators', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error ?? '저장에 실패했습니다.' });
        return;
      }

      setMessage({ type: 'success', text: '설정이 저장되었습니다.' });
      router.refresh();
    } catch {
      setMessage({ type: 'error', text: '예기치 않은 오류가 발생했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/creator/dashboard"
          className="text-sm text-muted hover:text-foreground"
        >
          ← 대시보드
        </Link>
      </div>

      <h1 className="mb-8 text-2xl font-bold text-foreground">크리에이터 설정</h1>

      {message && (
        <div className={`mb-6 rounded-lg px-4 py-3 text-sm ${
          message.type === 'success'
            ? 'bg-success/10 text-success'
            : 'bg-accent-soft text-accent-text'
        }`}>
          {message.text}
        </div>
      )}

      {/* 프로필 요약 */}
      <div className="mb-8 rounded-xl bg-surface p-5 ring-1 ring-border">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-lg font-bold text-primary-text">
            {(creator.channel_name ?? 'C')[0]}
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">
              {creator.channel_name ?? '채널 이름 없음'}
            </p>
            <p className="text-sm text-muted">
              구독자 {creator.subscriber_count.toLocaleString()}명 ·
              {' '}{GRADE_LABEL[creator.grade] ?? creator.grade} ·
              {' '}달성률 {creator.achievement_rate}%
            </p>
          </div>
        </div>
      </div>

      {/* 채널 정보 */}
      <section className="mb-8 rounded-2xl bg-surface p-6 ring-1 ring-border">
        <h2 className="mb-5 text-lg font-semibold text-foreground">채널 정보</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="channel_url" className="mb-1.5 block text-sm font-medium text-foreground">
              YouTube 채널 URL
            </label>
            <div className="flex gap-2">
              <input
                id="channel_url"
                type="url"
                value={channelUrl}
                onChange={(e) => setChannelUrl(e.target.value)}
                className="flex-1 rounded-xl border border-border bg-background text-foreground px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => fetchChannel(channelUrl)}
                disabled={channelLoading || !channelUrl.trim()}
                className="shrink-0 rounded-xl bg-secondary px-4 py-3 text-sm font-medium text-white hover:bg-secondary-hover disabled:opacity-50"
              >
                {channelLoading ? '조회 중...' : '재연동'}
              </button>
            </div>
          </div>

          {channelError && (
            <div className="rounded-lg bg-accent-soft px-4 py-3 text-sm text-accent-text">
              {channelError}
            </div>
          )}

          {channelInfo && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-3">
                {channelInfo.thumbnail_url && (
                  <img
                    src={channelInfo.thumbnail_url}
                    alt={channelInfo.channel_name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{channelInfo.channel_name}</p>
                  <p className="text-sm text-muted">
                    구독자 {channelInfo.subscriber_count.toLocaleString()}명
                  </p>
                </div>
                <div className="shrink-0 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                  연동 완료
                </div>
              </div>
              {channelInfo.categories.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {channelInfo.categories.map((cat) => (
                    <span key={cat} className="rounded-full bg-muted-soft px-2.5 py-0.5 text-xs text-muted">
                      {cat}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label htmlFor="channel_name" className="mb-1.5 block text-sm font-medium text-foreground">
              채널 이름
            </label>
            <input
              id="channel_name"
              type="text"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              className="w-full rounded-xl border border-border bg-background text-foreground px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </section>

      {/* 정산 계좌 */}
      <section className="mb-8 rounded-2xl bg-surface p-6 ring-1 ring-border">
        <h2 className="mb-5 text-lg font-semibold text-foreground">정산 계좌</h2>

        {creator.account_verified && (
          <div className="mb-4 rounded-lg bg-success/10 px-4 py-3 text-sm text-success">
            계좌 인증 완료
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="bank_code" className="mb-1.5 block text-sm font-medium text-foreground">
              은행
            </label>
            <select
              id="bank_code"
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              className="w-full rounded-xl border border-border bg-background text-foreground px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">선택하세요</option>
              {BANKS.map((bank) => (
                <option key={bank.code} value={bank.code}>
                  {bank.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="account_number" className="mb-1.5 block text-sm font-medium text-foreground">
              계좌번호
            </label>
            <input
              id="account_number"
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9-]/g, ''))}
              placeholder="'-' 없이 숫자만 입력"
              className="w-full rounded-xl border border-border bg-background text-foreground px-4 py-3 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="account_holder" className="mb-1.5 block text-sm font-medium text-foreground">
              예금주
            </label>
            <input
              id="account_holder"
              type="text"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              placeholder="예금주명"
              className="w-full rounded-xl border border-border bg-background text-foreground px-4 py-3 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </section>

      {/* KYC 본인인증 */}
      <section className="mb-8">
        <CreatorKYC
          kycVerified={creator.kyc_verified}
          kycType={creator.kyc_type}
          kycVerifiedAt={creator.kyc_verified_at}
        />
      </section>

      {/* 저장 버튼 */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-xl bg-primary py-3 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
      >
        {saving ? '저장 중...' : '변경사항 저장'}
      </button>
    </div>
  );
}
