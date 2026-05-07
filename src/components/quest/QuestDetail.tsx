'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Quest, SubQuest, Creator } from '@/types/database';
import { PledgeForm } from '@/components/payment/PledgeForm';
import { VideoSubmit } from '@/components/quest/VideoSubmit';
import { VoteSection } from '@/components/quest/VoteSection';
import { NominationSection } from '@/components/quest/NominationSection';

interface QuestDetailProps {
  quest: Quest & {
    sub_quests: SubQuest[];
    creator: Creator | null;
  };
  video?: {
    id: string;
    youtube_video_id: string | null;
    video_url: string;
    status: string;
    ai_verification_score: number | null;
    ai_verification_result: Record<string, unknown> | null;
    vote_deadline_at: string | null;
    created_at: string;
  } | null;
  pledgeCount: number;
  currentUserId: string | null;
  currentCreatorId?: string | null;
  userInfo?: { id: string; email: string; name: string } | null;
  isCreator?: boolean;
  isPledger?: boolean;
}

export function QuestDetail({ quest, video, pledgeCount, currentUserId, currentCreatorId, userInfo, isCreator, isPledger }: QuestDetailProps) {
  const router = useRouter();
  const [showPledge, setShowPledge] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const handleAcceptQuest = async () => {
    if (!isCreator) {
      router.push('/creator');
      return;
    }

    setAccepting(true);
    setAcceptError(null);

    try {
      const res = await fetch(`/api/quests/${quest.id}/accept`, { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        setAcceptError(data.error ?? '퀘스트 수락에 실패했습니다.');
        setAccepting(false);
        return;
      }

      router.push('/creator/quests');
      router.refresh();
    } catch {
      setAcceptError('예기치 않은 오류가 발생했습니다.');
      setAccepting(false);
    }
  };
  const mainQuests = quest.sub_quests?.filter((sq) => sq.is_main) ?? [];
  const subQuests = quest.sub_quests?.filter((sq) => !sq.is_main) ?? [];

  const statusLabel: Record<string, string> = {
    open: '모집 중',
    in_progress: '제작 중',
    reviewing: '검토 중',
    completed: '완료',
    cancelled: '취소됨',
  };

  return (
    <div className="mx-auto max-w-3xl">
      {/* 뒤로가기 */}
      <Link
        href="/quests"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        ← 퀘스트 목록
      </Link>

      {/* 헤더 */}
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-3 flex-wrap">
          <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary-text">
            {statusLabel[quest.status] ?? quest.status}
          </span>
          {quest.is_competitive && (
            <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary-text">
              경쟁 방식
            </span>
          )}
          {quest.target_channel_id && (
            <span className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary">
              💌 지명 퀘스트
            </span>
          )}
        </div>

        <h1 className="mb-2 text-2xl font-bold text-foreground">{quest.title}</h1>
        <p className="text-muted">{quest.description}</p>
      </div>

      {/* 지명된 유튜버 정보 + 공유 도우미 */}
      {quest.target_channel_id && quest.target_channel_name && (
        <NominationSection
          channelName={quest.target_channel_name}
          channelThumbnail={quest.target_channel_thumbnail}
          channelUrl={quest.target_channel_url}
          questUrl={typeof window !== 'undefined' ? `${window.location.origin}/quests/${quest.id}` : `/quests/${quest.id}`}
          questTitle={quest.title}
          rewardAmount={quest.creator_reward_amount}
        />
      )}

      {/* 보상 정보 카드 */}
      <div className="mb-8 rounded-xl border border-border bg-muted-soft p-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-muted">크리에이터 보상</p>
            <p className="mt-1 text-2xl font-bold text-primary-text">
              {quest.creator_reward_amount.toLocaleString()}원
            </p>
          </div>
          <div>
            <p className="text-sm text-muted">총 후원액</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {quest.total_pledged_amount.toLocaleString()}원
            </p>
          </div>
          <div>
            <p className="text-sm text-muted">후원자</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {pledgeCount}명
            </p>
          </div>
        </div>
      </div>

      {/* 필수 조건 */}
      {mainQuests.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-lg font-semibold text-foreground">필수 조건</h2>
          <div className="space-y-2">
            {mainQuests.map((sq) => (
              <div
                key={sq.id}
                className="flex items-center gap-3 rounded-lg border border-accent/30 bg-accent-soft px-4 py-3"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs text-white">
                  !
                </span>
                <span className="text-sm text-foreground">{sq.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 서브퀘스트 (⭐ 보너스 별) */}
      {subQuests.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-foreground">보너스 별 ⭐</h2>
          <p className="mb-3 text-xs text-muted">달성하면 크리에이터 프로필에 별이 추가됩니다. 후원자 투표로 결정!</p>
          <div className="space-y-2">
            {subQuests.map((sq) => (
              <div
                key={sq.id}
                className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${sq.status === 'achieved' ? 'text-yellow-500' : 'text-muted'}`}>
                    {sq.status === 'achieved' ? '⭐' : '☆'}
                  </span>
                  <span className="text-sm text-foreground">{sq.description}</span>
                </div>
                {(sq.star_votes_yes > 0 || sq.star_votes_no > 0) && (
                  <span className="text-xs text-muted">
                    👍 {sq.star_votes_yes} / 👎 {sq.star_votes_no}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 크리에이터 정보 */}
      {quest.creator && (
        <div className="mb-8 rounded-xl border border-border p-5">
          <h2 className="mb-3 text-lg font-semibold text-foreground">담당 크리에이터</h2>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary-text">
              {quest.creator.channel_name?.[0] ?? 'C'}
            </div>
            <div>
              <p className="font-medium text-foreground">
                {quest.creator.channel_name ?? '크리에이터'}
              </p>
              <p className="text-xs text-muted">
                구독자 {quest.creator.subscriber_count.toLocaleString()}명 · {quest.creator.grade}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 에러 메시지 */}
      {acceptError && (
        <div className="mb-4 rounded-lg bg-accent-soft px-4 py-3 text-sm text-accent-text">
          {acceptError}
        </div>
      )}

      {/* 후원 폼 */}
      {quest.status === 'open' && currentUserId && userInfo && (
        <>
          {showPledge ? (
            <div className="mb-8 rounded-2xl bg-surface p-6 ring-1 ring-border">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">후원하기</h2>
                <button
                  onClick={() => setShowPledge(false)}
                  className="text-sm text-muted hover:text-foreground"
                >
                  닫기
                </button>
              </div>
              <PledgeForm
                questId={quest.id}
                questTitle={quest.title}
                userId={userInfo.id}
                userEmail={userInfo.email}
                userName={userInfo.name}
              />
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => setShowPledge(true)}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-medium text-white hover:bg-primary-hover"
              >
                후원하기
              </button>
              <button
                onClick={handleAcceptQuest}
                disabled={accepting}
                className="flex-1 rounded-xl border border-border bg-surface py-3 text-sm font-medium text-foreground hover:bg-muted-soft disabled:opacity-50"
              >
                {accepting ? '수락 중...' : isCreator ? '크리에이터로 도전하기' : '크리에이터 등록 후 도전하기'}
              </button>
            </div>
          )}
        </>
      )}

      {/* 진행 중인 퀘스트 — 해당 크리에이터 본인이면 영상 제출 UI */}
      {(quest.status === 'in_progress' || quest.status === 'reviewing') &&
       currentCreatorId && quest.creator?.id === currentCreatorId && (
        <div className="mb-8">
          <VideoSubmit
            questId={quest.id}
            existingVideo={video}
            deadlineAt={quest.deadline_at}
          />
        </div>
      )}

      {/* 진행 중이지만 다른 사람의 퀘스트 */}
      {quest.status === 'in_progress' && currentUserId &&
       (!currentCreatorId || quest.creator?.id !== currentCreatorId) && (
        <div className="rounded-xl bg-primary-soft p-4 text-center">
          <p className="text-sm font-medium text-primary-text">
            이 퀘스트는 현재 제작이 진행 중입니다
          </p>
        </div>
      )}

      {/* 검증 중 상태 — 투표 UI 표시 */}
      {quest.status === 'reviewing' && video && (
        <div className="mb-8">
          <VoteSection
            videoId={video.id}
            videoUrl={video.video_url}
            voteDeadlineAt={video.vote_deadline_at}
            totalBackers={pledgeCount}
            isPledger={isPledger ?? false}
            subQuests={quest.sub_quests ?? []}
            aiScore={video.ai_verification_score}
            aiResult={video.ai_verification_result}
          />
        </div>
      )}

      {!currentUserId && quest.status === 'open' && (
        <Link
          href="/login"
          className="block rounded-xl bg-primary py-3 text-center text-sm font-medium text-white hover:bg-primary-hover"
        >
          로그인하고 후원하기
        </Link>
      )}
    </div>
  );
}
