'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface VideoSubmitProps {
  questId: string;
  /** 현재 제출된 영상이 있으면 그 정보 */
  existingVideo?: {
    id: string;
    youtube_video_id: string | null;
    video_url: string;
    status: string;
    ai_verification_score: number | null;
    created_at: string;
  } | null;
  /** 데드라인 */
  deadlineAt?: string | null;
}

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  uploaded: { text: '제출됨 · 검증 대기', color: 'bg-primary-soft text-primary-text' },
  verifying: { text: 'AI 검증 진행 중', color: 'bg-primary-soft text-primary-text' },
  approved: { text: '검증 통과', color: 'bg-success/10 text-success' },
  manual_review: { text: '후원자 투표 진행 중', color: 'bg-primary-soft text-primary-text' },
  rejected: { text: '검증 거부됨', color: 'bg-accent-soft text-accent-text' },
  published: { text: '공개됨', color: 'bg-success/10 text-success' },
};

export function VideoSubmit({ questId, existingVideo, deadlineAt }: VideoSubmitProps) {
  const router = useRouter();
  const [videoUrl, setVideoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 이미 제출됨 → 상태만 표시
  if (existingVideo) {
    const status = STATUS_LABEL[existingVideo.status] ?? { text: existingVideo.status, color: 'bg-muted-soft text-muted' };
    return (
      <div className="rounded-2xl bg-surface p-6 ring-1 ring-border">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">제출된 영상</h2>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.color}`}>
            {status.text}
          </span>
        </div>

        <a
          href={existingVideo.video_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-xl border border-border bg-background p-4 hover:border-primary/30"
        >
          <p className="text-sm text-muted">YouTube 링크</p>
          <p className="mt-1 break-all text-sm text-primary-text hover:underline">
            {existingVideo.video_url}
          </p>
        </a>

        {existingVideo.ai_verification_score !== null && (
          <div className="mt-3 text-xs text-muted">
            AI 검증 점수: <span className="font-semibold text-foreground">{existingVideo.ai_verification_score}점</span>
          </div>
        )}

        <p className="mt-3 text-xs text-muted">
          제출 시각: {new Date(existingVideo.created_at).toLocaleString('ko-KR')}
        </p>
      </div>
    );
  }

  // 데드라인 계산
  const now = new Date();
  const deadline = deadlineAt ? new Date(deadlineAt) : null;
  const isOverdue = deadline && deadline < now;
  const daysLeft = deadline ? Math.ceil((deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)) : null;

  const handleSubmit = async () => {
    if (!videoUrl.trim()) {
      setError('YouTube 영상 URL을 입력해주세요.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/quests/${questId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_url: videoUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? '영상 제출에 실패했습니다.');
        setSubmitting(false);
        return;
      }

      router.refresh();
    } catch {
      setError('예기치 않은 오류가 발생했습니다.');
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl bg-surface p-6 ring-1 ring-border">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">영상 제출</h2>
        {deadline && (
          <span className={`text-xs ${isOverdue ? 'text-accent' : 'text-muted'}`}>
            {isOverdue
              ? '⚠️ 데드라인 초과'
              : daysLeft !== null && daysLeft <= 3
                ? `⏰ ${daysLeft}일 남음`
                : `마감 ${deadline.toLocaleDateString('ko-KR')}`}
          </span>
        )}
      </div>
      <p className="mb-5 text-sm text-muted">
        완성된 영상을 YouTube에 업로드하고 링크를 제출해주세요.
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-accent-soft px-4 py-3 text-sm text-accent-text">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="video_url" className="mb-1.5 block text-sm font-medium text-foreground">
          YouTube URL <span className="text-accent">*</span>
        </label>
        <input
          id="video_url"
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="w-full rounded-xl border border-border bg-background text-foreground px-4 py-3 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          disabled={submitting || !!isOverdue}
        />
      </div>

      <div className="mb-5 rounded-xl bg-muted-soft/50 p-4 text-xs text-muted space-y-1">
        <p>✅ 본인 채널에 업로드된 영상만 제출 가능합니다.</p>
        <p>✅ 퀘스트 수락 이후에 업로드된 영상이어야 합니다.</p>
        <p>✅ 다른 퀘스트에 이미 제출한 영상은 사용할 수 없습니다.</p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting || !!isOverdue || !videoUrl.trim()}
        className="w-full rounded-xl bg-primary py-3 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
      >
        {submitting ? '제출 중...' : isOverdue ? '데드라인 초과' : '영상 제출'}
      </button>
    </div>
  );
}
