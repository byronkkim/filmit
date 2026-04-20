'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface VoteSectionProps {
  videoId: string;
  videoUrl: string;
  voteDeadlineAt: string | null;
  totalBackers: number;
  isPledger: boolean;  // 현재 사용자가 이 퀘스트 후원자인지
  subQuests: Array<{
    id: string;
    description: string;
    is_main: boolean;
    status: string;
    star_votes_yes: number;
    star_votes_no: number;
  }>;
}

interface VoteStatus {
  yes: number;
  no: number;
  my_vote: boolean | null;
}

export function VoteSection({
  videoId,
  videoUrl,
  voteDeadlineAt,
  totalBackers,
  isPledger,
  subQuests,
}: VoteSectionProps) {
  const router = useRouter();
  const [mainVote, setMainVote] = useState<VoteStatus>({ yes: 0, no: 0, my_vote: null });
  const [subVotes, setSubVotes] = useState<Record<string, boolean | null>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadMainVote = useCallback(async () => {
    try {
      const res = await fetch(`/api/videos/${videoId}/vote`);
      if (res.ok) {
        const data = await res.json();
        setMainVote(data);
      }
    } catch {
      // ignore
    }
  }, [videoId]);

  useEffect(() => {
    loadMainVote();
  }, [loadMainVote]);

  // 투표 기간
  const now = new Date();
  const deadline = voteDeadlineAt ? new Date(voteDeadlineAt) : null;
  const isClosed = deadline && deadline < now;
  const hoursLeft = deadline ? Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (60 * 60 * 1000))) : null;

  const handleMainVote = async (vote: boolean) => {
    if (!isPledger) {
      setError('이 퀘스트에 후원한 사람만 투표할 수 있습니다.');
      return;
    }

    setSubmitting('main');
    setError(null);
    try {
      const res = await fetch(`/api/videos/${videoId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '투표에 실패했습니다.');
        return;
      }
      await loadMainVote();
      router.refresh();
    } catch {
      setError('예기치 않은 오류가 발생했습니다.');
    } finally {
      setSubmitting(null);
    }
  };

  const handleSubVote = async (subQuestId: string, vote: boolean) => {
    if (!isPledger) {
      setError('이 퀘스트에 후원한 사람만 투표할 수 있습니다.');
      return;
    }

    setSubmitting(`sub-${subQuestId}`);
    setError(null);
    try {
      const res = await fetch(`/api/sub-quests/${subQuestId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '투표에 실패했습니다.');
        return;
      }
      setSubVotes(prev => ({ ...prev, [subQuestId]: vote }));
      router.refresh();
    } catch {
      setError('예기치 않은 오류가 발생했습니다.');
    } finally {
      setSubmitting(null);
    }
  };

  // 집계 비율 (무응답 = 승인)
  const explicitNoRatio = totalBackers > 0 ? mainVote.no / totalBackers : 0;
  const impliedYesCount = totalBackers - mainVote.no;  // 무응답 포함 OK
  const impliedYesRatio = totalBackers > 0 ? impliedYesCount / totalBackers : 1;

  const subQuestsOnly = subQuests.filter(sq => !sq.is_main);

  return (
    <div className="space-y-6">
      {/* 메인 영상 투표 */}
      <div className="rounded-2xl bg-surface p-6 ring-1 ring-border">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">영상 판정 투표</h2>
          {deadline && (
            <span className={`text-xs ${isClosed ? 'text-accent' : hoursLeft! < 24 ? 'text-accent' : 'text-muted'}`}>
              {isClosed
                ? '투표 종료'
                : hoursLeft! < 24
                  ? `⏰ ${hoursLeft}시간 남음`
                  : `${Math.ceil(hoursLeft! / 24)}일 남음`}
            </span>
          )}
        </div>

        <div className="mb-5 rounded-xl border border-border bg-background p-4">
          <p className="mb-2 text-sm font-medium text-foreground">
            이 영상이 퀘스트 주제에 맞나요?
          </p>
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs text-primary-text hover:underline"
          >
            → 영상 보러가기
          </a>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-accent-soft px-4 py-3 text-sm text-accent-text">
            {error}
          </div>
        )}

        {/* 투표 버튼 */}
        {!isClosed && isPledger && (
          <div className="mb-4 flex gap-3">
            <button
              onClick={() => handleMainVote(true)}
              disabled={submitting === 'main'}
              className={`flex-1 rounded-xl py-3 text-sm font-medium transition-colors disabled:opacity-50 ${
                mainVote.my_vote === true
                  ? 'bg-success text-white'
                  : 'border border-border bg-surface text-foreground hover:border-success'
              }`}
            >
              👍 맞아요
            </button>
            <button
              onClick={() => handleMainVote(false)}
              disabled={submitting === 'main'}
              className={`flex-1 rounded-xl py-3 text-sm font-medium transition-colors disabled:opacity-50 ${
                mainVote.my_vote === false
                  ? 'bg-accent text-white'
                  : 'border border-border bg-surface text-foreground hover:border-accent'
              }`}
            >
              👎 아니에요
            </button>
          </div>
        )}

        {!isPledger && !isClosed && (
          <div className="mb-4 rounded-lg bg-muted-soft/50 px-4 py-3 text-sm text-muted">
            이 퀘스트에 후원한 분만 투표할 수 있습니다.
          </div>
        )}

        {/* 집계 */}
        <div className="border-t border-border pt-4 space-y-2">
          <div className="flex justify-between text-xs text-muted">
            <span>전체 후원자</span>
            <span className="font-semibold text-foreground">{totalBackers}명</span>
          </div>
          <div className="flex justify-between text-xs text-muted">
            <span>👍 맞아요 (명시적)</span>
            <span className="font-semibold text-success">{mainVote.yes}명</span>
          </div>
          <div className="flex justify-between text-xs text-muted">
            <span>👎 아니에요</span>
            <span className="font-semibold text-accent">{mainVote.no}명 ({(explicitNoRatio * 100).toFixed(0)}%)</span>
          </div>
          <div className="flex justify-between text-xs text-muted pt-2 border-t border-border">
            <span>무응답 포함 승인율 (무응답=승인)</span>
            <span className="font-semibold text-foreground">{(impliedYesRatio * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* 서브퀘스트 별 투표 */}
      {subQuestsOnly.length > 0 && (
        <div className="rounded-2xl bg-surface p-6 ring-1 ring-border">
          <h2 className="mb-1 text-lg font-semibold text-foreground">보너스 별 투표 ⭐</h2>
          <p className="mb-4 text-xs text-muted">
            달성했다고 생각되는 조건에만 찬성하세요. 과반수 동의 시 크리에이터에게 ⭐이 부여됩니다.
          </p>
          <div className="space-y-3">
            {subQuestsOnly.map(sq => {
              const myVote = subVotes[sq.id];
              const totalVotes = sq.star_votes_yes + sq.star_votes_no;
              return (
                <div key={sq.id} className="rounded-xl border border-border bg-background p-4">
                  <p className="mb-3 text-sm text-foreground">{sq.description}</p>
                  {isPledger && !isClosed ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSubVote(sq.id, true)}
                        disabled={submitting === `sub-${sq.id}`}
                        className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
                          myVote === true
                            ? 'bg-success text-white'
                            : 'border border-border text-muted hover:border-success'
                        }`}
                      >
                        달성했어요
                      </button>
                      <button
                        onClick={() => handleSubVote(sq.id, false)}
                        disabled={submitting === `sub-${sq.id}`}
                        className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
                          myVote === false
                            ? 'bg-accent text-white'
                            : 'border border-border text-muted hover:border-accent'
                        }`}
                      >
                        못했어요
                      </button>
                    </div>
                  ) : null}
                  {totalVotes > 0 && (
                    <div className="mt-2 flex gap-3 text-xs text-muted">
                      <span>👍 {sq.star_votes_yes}</span>
                      <span>👎 {sq.star_votes_no}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
