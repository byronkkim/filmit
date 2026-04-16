'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SubQuestInput {
  description: string;
  is_main: boolean;
}

export function QuestForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subQuests, setSubQuests] = useState<SubQuestInput[]>([
    { description: '', is_main: true },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addSubQuest = (isMain: boolean) => {
    setSubQuests([...subQuests, { description: '', is_main: isMain }]);
  };

  const removeSubQuest = (index: number) => {
    setSubQuests(subQuests.filter((_, i) => i !== index));
  };

  const updateSubQuest = (index: number, value: string) => {
    const updated = [...subQuests];
    updated[index].description = value;
    setSubQuests(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const validSubQuests = subQuests.filter((sq) => sq.description.trim());

    const res = await fetch('/api/quests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        sub_quests: validSubQuests,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? '퀘스트 등록에 실패했습니다.');
      setSubmitting(false);
      return;
    }

    const { quest } = await res.json();
    router.push(`/quests/${quest.id}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-accent-soft px-4 py-3 text-sm text-accent-text">
          {error}
        </div>
      )}

      {/* 제목 */}
      <div>
        <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-foreground">
          퀘스트 제목
        </label>
        <input
          id="title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 서울 숨은 맛집 투어 브이로그"
          className="w-full rounded-xl border border-border bg-surface text-foreground px-4 py-3 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* 설명 */}
      <div>
        <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-foreground">
          상세 설명
        </label>
        <textarea
          id="description"
          required
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="어떤 영상을 보고 싶은지 자세히 설명해주세요"
          className="w-full rounded-xl border border-border bg-surface text-foreground px-4 py-3 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* 필수 조건 */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">필수 조건</label>
          <button
            type="button"
            onClick={() => addSubQuest(true)}
            className="text-xs font-medium text-primary-text hover:text-primary-hover"
          >
            + 추가
          </button>
        </div>
        <div className="space-y-2">
          {subQuests
            .map((sq, i) => ({ sq, i }))
            .filter(({ sq }) => sq.is_main)
            .map(({ sq, i }) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={sq.description}
                  onChange={(e) => updateSubQuest(i, e.target.value)}
                  placeholder="예: 3곳 이상 방문"
                  className="flex-1 rounded-lg border border-border bg-surface text-foreground px-3 py-2 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {subQuests.filter((s) => s.is_main).length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSubQuest(i)}
                    className="px-2 text-muted hover:text-accent"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
        </div>
      </div>

      {/* 추가 조건 */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">추가 조건 (선택)</label>
          <button
            type="button"
            onClick={() => addSubQuest(false)}
            className="text-xs font-medium text-primary-text hover:text-primary-hover"
          >
            + 추가
          </button>
        </div>
        <div className="space-y-2">
          {subQuests
            .map((sq, i) => ({ sq, i }))
            .filter(({ sq }) => !sq.is_main)
            .map(({ sq, i }) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={sq.description}
                  onChange={(e) => updateSubQuest(i, e.target.value)}
                  placeholder="예: 가격대 정보 포함"
                  className="flex-1 rounded-lg border border-border bg-surface text-foreground px-3 py-2 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => removeSubQuest(i)}
                  className="px-2 text-muted hover:text-accent"
                >
                  ✕
                </button>
              </div>
            ))}
          {subQuests.filter((s) => !s.is_main).length === 0 && (
            <p className="text-xs text-muted">보너스 조건을 달성하면 크리에이터에게 ⭐ 별이 추가됩니다</p>
          )}
        </div>
      </div>

      {/* 제출 */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-primary py-3 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
      >
        {submitting ? '등록 중...' : '퀘스트 등록'}
      </button>
    </form>
  );
}
