import Link from 'next/link';
import type { Quest, SubQuest } from '@/types/database';

interface QuestCardProps {
  quest: Quest & { sub_quests: SubQuest[] };
}

export function QuestCard({ quest }: QuestCardProps) {
  const mainQuests = quest.sub_quests?.filter((sq) => sq.is_main) ?? [];
  const subQuests = quest.sub_quests?.filter((sq) => !sq.is_main) ?? [];

  const statusLabel: Record<string, string> = {
    open: '모집 중',
    in_progress: '제작 중',
    reviewing: '검토 중',
    completed: '완료',
  };

  return (
    <Link href={`/quests/${quest.id}`}>
      <div className="group rounded-xl border border-border bg-surface p-5 transition-shadow hover:shadow-md">
        <div className="mb-3 flex items-start justify-between">
          <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary-text">
            {statusLabel[quest.status] ?? quest.status}
          </span>
          <span className="text-lg font-bold text-primary-text">
            {quest.creator_reward_amount.toLocaleString()}원
          </span>
        </div>

        <h3 className="mb-2 text-base font-semibold text-foreground group-hover:text-primary-text">
          {quest.title}
        </h3>

        <p className="mb-4 line-clamp-2 text-sm text-muted">
          {quest.description}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {mainQuests.map((sq) => (
            <span
              key={sq.id}
              className="rounded bg-accent-soft px-2 py-0.5 text-xs text-accent-text"
            >
              필수: {sq.description}
            </span>
          ))}
          {subQuests.length > 0 && (
            <span className="rounded bg-muted-soft px-2 py-0.5 text-xs text-muted">
              +{subQuests.length}개 추가 조건
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-muted">
          <span>후원 {quest.total_pledged_amount.toLocaleString()}원</span>
          <span>
            {new Date(quest.created_at).toLocaleDateString('ko-KR')}
          </span>
        </div>
      </div>
    </Link>
  );
}
