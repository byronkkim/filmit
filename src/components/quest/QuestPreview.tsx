'use client';

interface ParsedQuest {
  title: string;
  description: string;
  main_quests: string[];
  sub_quests: string[];
}

interface QuestPreviewProps {
  quest: ParsedQuest;
  onConfirm: () => void;
  onEdit: () => void;
  submitting: boolean;
}

export function QuestPreview({ quest, onConfirm, onEdit, submitting }: QuestPreviewProps) {
  return (
    <div className="rounded-xl border-2 border-primary/30 bg-surface p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-primary" />
        <span className="text-sm font-medium text-primary-text">퀘스트 미리보기</span>
      </div>

      <h3 className="mb-2 text-lg font-bold text-foreground">{quest.title}</h3>
      <p className="mb-4 text-sm text-muted">{quest.description}</p>

      {/* 필수 조건 */}
      {quest.main_quests.length > 0 && (
        <div className="mb-3">
          <p className="mb-1.5 text-xs font-medium text-accent-text">필수 조건</p>
          <div className="space-y-1.5">
            {quest.main_quests.map((mq, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-accent-soft px-3 py-2">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] text-white">!</span>
                <span className="text-sm text-foreground">{mq}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 추가 조건 */}
      {quest.sub_quests.length > 0 && (
        <div className="mb-4">
          <p className="mb-1.5 text-xs font-medium text-muted">추가 조건</p>
          <div className="space-y-1.5">
            {quest.sub_quests.map((sq, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-muted-soft px-3 py-2">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[10px] text-white">+</span>
                <span className="text-sm text-foreground">{sq}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          disabled={submitting}
          className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
        >
          {submitting ? '등록 중...' : '이대로 등록하기'}
        </button>
        <button
          onClick={onEdit}
          disabled={submitting}
          className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted-soft disabled:opacity-50"
        >
          수정하기
        </button>
      </div>
    </div>
  );
}
