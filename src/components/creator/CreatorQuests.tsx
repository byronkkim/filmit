'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Quest, SubQuest } from '@/types/database';

type QuestWithSubs = Pick<
  Quest,
  'id' | 'title' | 'description' | 'status' |
  'creator_reward_amount' | 'total_pledged_amount' |
  'accepted_at' | 'completed_at' | 'deadline_at'
> & {
  sub_quests: Pick<SubQuest, 'id' | 'description' | 'is_main' | 'status'>[];
};

interface CreatorQuestsProps {
  quests: QuestWithSubs[];
}

const TABS = [
  { key: 'all', label: '전체' },
  { key: 'in_progress', label: '진행 중' },
  { key: 'reviewing', label: '검토 중' },
  { key: 'completed', label: '완료' },
] as const;

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  in_progress: { label: '진행 중', className: 'bg-primary-soft text-primary-text' },
  reviewing: { label: '검토 중', className: 'bg-accent-soft text-accent-text' },
  completed: { label: '완료', className: 'bg-success/10 text-success' },
  cancelled: { label: '취소됨', className: 'bg-muted-soft text-muted' },
};

export function CreatorQuests({ quests }: CreatorQuestsProps) {
  const [activeTab, setActiveTab] = useState<string>('all');

  const filtered = activeTab === 'all'
    ? quests
    : quests.filter((q) => q.status === activeTab);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">내 퀘스트</h1>
        <Link
          href="/quests"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
        >
          퀘스트 찾기
        </Link>
      </div>

      {/* 탭 필터 */}
      <div className="mb-6 flex gap-2">
        {TABS.map((tab) => {
          const count = tab.key === 'all'
            ? quests.length
            : quests.filter((q) => q.status === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary text-white'
                  : 'bg-muted-soft text-muted hover:text-foreground'
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {/* 퀘스트 목록 */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-surface p-12 text-center ring-1 ring-border">
          <p className="text-muted">
            {activeTab === 'all'
              ? '아직 수락한 퀘스트가 없습니다.'
              : '해당 상태의 퀘스트가 없습니다.'}
          </p>
          <Link
            href="/quests"
            className="mt-4 inline-block text-sm font-medium text-primary-text hover:underline"
          >
            퀘스트 찾아보기 →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((quest) => {
            const style = STATUS_STYLE[quest.status] ?? { label: quest.status, className: 'bg-muted-soft text-muted' };
            const mainCount = quest.sub_quests.filter((sq) => sq.is_main).length;
            const achievedCount = quest.sub_quests.filter((sq) => sq.status === 'achieved').length;
            const totalSubs = quest.sub_quests.length;

            return (
              <Link
                key={quest.id}
                href={`/quests/${quest.id}`}
                className="block rounded-xl bg-surface p-5 ring-1 ring-border transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${style.className}`}>
                    {style.label}
                  </span>
                  <span className="text-lg font-bold text-primary-text">
                    {quest.creator_reward_amount.toLocaleString()}원
                  </span>
                </div>

                <h3 className="mb-1 text-base font-semibold text-foreground">{quest.title}</h3>
                <p className="mb-3 text-sm text-muted line-clamp-2">{quest.description}</p>

                {/* 진행률 바 */}
                {totalSubs > 0 && (
                  <div className="mb-2">
                    <div className="mb-1 flex justify-between text-xs text-muted">
                      <span>서브퀘스트 달성</span>
                      <span>{achievedCount}/{totalSubs}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted-soft">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${totalSubs > 0 ? (achievedCount / totalSubs) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 text-xs text-muted">
                  <span>필수 조건 {mainCount}개</span>
                  <span>·</span>
                  <span>후원 총 {quest.total_pledged_amount.toLocaleString()}원</span>
                  {quest.deadline_at && (
                    <>
                      <span>·</span>
                      <span>마감 {new Date(quest.deadline_at).toLocaleDateString('ko-KR')}</span>
                    </>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
