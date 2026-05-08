'use client';

import Link from 'next/link';
import type { Creator } from '@/types/database';

interface CreatorDashboardProps {
  creator: Creator;
  openQuestCount: number;
}

const GRADE_LABEL: Record<string, string> = {
  bronze: '브론즈',
  silver: '실버',
  gold: '골드',
  platinum: '플래티넘',
};

export function CreatorDashboard({ creator, openQuestCount }: CreatorDashboardProps) {
  const accountSet = creator.bank_code && creator.account_number;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">크리에이터 대시보드</h1>
        <p className="mt-1 text-sm text-muted">
          {creator.channel_name ?? '내 채널'} · {GRADE_LABEL[creator.grade] ?? creator.grade}
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-surface p-5 ring-1 ring-border text-center">
          <p className="text-sm text-muted">완료 퀘스트</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{creator.completed_quests}</p>
        </div>
        <div className="rounded-xl bg-surface p-5 ring-1 ring-border text-center">
          <p className="text-sm text-muted">달성률</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{creator.achievement_rate}%</p>
        </div>
        <div className="rounded-xl bg-surface p-5 ring-1 ring-border text-center">
          <p className="text-sm text-muted">등급</p>
          <p className="mt-1 text-2xl font-bold text-primary-text">
            {GRADE_LABEL[creator.grade] ?? creator.grade}
          </p>
        </div>
      </div>

      {/* 알림 영역 */}
      {!accountSet && (
        <div className="mb-6 rounded-xl bg-accent-soft p-4">
          <p className="text-sm text-accent-text">
            정산 계좌가 등록되지 않았습니다. 퀘스트 보상을 받으려면 계좌를 등록해주세요.
          </p>
          <Link
            href="/creator/settings"
            className="mt-2 inline-block text-sm font-medium text-accent-text underline"
          >
            계좌 등록하기
          </Link>
        </div>
      )}

      {/* 퀵 액션 */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/quests"
          className="rounded-xl bg-primary-soft p-5 transition-shadow hover:shadow-md"
        >
          <p className="text-sm font-medium text-primary-text">도전 가능한 퀘스트</p>
          <p className="mt-1 text-3xl font-bold text-primary-text">{openQuestCount}개</p>
          <p className="mt-2 text-xs text-muted">퀘스트 찾기 →</p>
        </Link>

        <Link
          href="/creator/quests"
          className="rounded-xl bg-muted-soft p-5 transition-shadow hover:shadow-md"
        >
          <p className="text-sm font-medium text-foreground">내 퀘스트</p>
          <p className="mt-1 text-3xl font-bold text-foreground">{creator.completed_quests}개</p>
          <p className="mt-2 text-xs text-muted">진행 현황 보기 →</p>
        </Link>
      </div>
    </div>
  );
}
