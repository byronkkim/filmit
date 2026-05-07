'use client';

import { useState } from 'react';

interface NominationSectionProps {
  channelName: string;
  channelThumbnail: string | null;
  channelUrl: string | null;
  questUrl: string;
  questTitle: string;
  rewardAmount: number;
}

export function NominationSection({
  channelName,
  channelThumbnail,
  channelUrl,
  questUrl,
  questTitle,
  rewardAmount,
}: NominationSectionProps) {
  const [copied, setCopied] = useState(false);

  const commentTemplate = `${channelName}님!
filmit에 "${questTitle}" 영상 요청이 등록됐어요. 보상 ${rewardAmount.toLocaleString()}원입니다.
${questUrl}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(commentTemplate);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="mb-8 rounded-2xl border border-secondary/30 bg-secondary/5 p-5">
      <div className="mb-4 flex items-center gap-3">
        {channelThumbnail && (
          <img
            src={channelThumbnail}
            alt={channelName}
            className="h-12 w-12 rounded-full object-cover"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted">지명된 크리에이터</p>
          <p className="font-semibold text-foreground truncate">{channelName}</p>
        </div>
        {channelUrl && (
          <a
            href={channelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted-soft"
          >
            채널 보기 →
          </a>
        )}
      </div>

      <div className="rounded-lg bg-surface p-3">
        <p className="mb-2 text-xs font-medium text-muted">📢 직접 알리고 싶다면 아래 텍스트를 복사해서 해당 채널 영상 댓글에 남겨주세요</p>
        <div className="rounded-md bg-background p-3 text-sm text-foreground whitespace-pre-line">
          {commentTemplate}
        </div>
        <button
          onClick={handleCopy}
          className="mt-2 w-full rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary-hover"
        >
          {copied ? '✓ 복사됨!' : '댓글 텍스트 복사하기'}
        </button>
      </div>
    </div>
  );
}
