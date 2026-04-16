'use client';

import { useState, useEffect } from 'react';
import { QuestChat } from './QuestChat';
import { QuestForm } from './QuestForm';

type Mode = 'ai' | 'form';

const STORAGE_KEY = 'filmit_quest_mode';

export function QuestCreator() {
  const [mode, setMode] = useState<Mode>('form');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Mode | null;
    if (saved === 'ai' || saved === 'form') {
      setMode(saved);
    }
    setLoaded(true);
  }, []);

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
  };

  if (!loaded) return null;

  return (
    <div>
      {/* 모드 전환 탭 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">퀘스트 등록</h1>
          <p className="mt-0.5 text-sm text-muted">
            {mode === 'ai'
              ? 'AI와 대화하며 퀘스트를 만들어보세요'
              : '직접 퀘스트 내용을 작성하세요'}
          </p>
        </div>
        <div className="flex rounded-lg border border-border bg-muted-soft p-0.5">
          <button
            onClick={() => handleModeChange('ai')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === 'ai'
                ? 'bg-surface text-foreground shadow-sm'
                : 'text-muted hover:text-foreground'
            }`}
          >
            AI 추천
          </button>
          <button
            onClick={() => handleModeChange('form')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === 'form'
                ? 'bg-surface text-foreground shadow-sm'
                : 'text-muted hover:text-foreground'
            }`}
          >
            직접 작성
          </button>
        </div>
      </div>

      {/* 기본값 설정 */}
      <div className="mb-4 text-right">
        <button
          onClick={() => {
            localStorage.setItem(STORAGE_KEY, mode);
          }}
          className="text-xs text-muted hover:text-foreground"
        >
          현재 모드를 기본값으로 저장
        </button>
      </div>

      {/* 컨텐츠 */}
      {mode === 'ai' ? <QuestChat /> : <QuestForm />}
    </div>
  );
}
