'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QuestPreview } from './QuestPreview';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ParsedQuest {
  title: string;
  description: string;
  main_quests: string[];
  sub_quests: string[];
}

export function QuestChat() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        '안녕하세요! 어떤 영상을 보고 싶으신가요?\n자세히 설명해주시면 제가 퀘스트로 깔끔하게 정리해드릴게요.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsedQuest, setParsedQuest] = useState<ParsedQuest | null>(null);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [loading]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage: Message = { role: 'user', content: trimmed };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/quests/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await res.json();

      if (data.quest) {
        setParsedQuest(data.quest);
        setEditing(false);
        setMessages([
          ...newMessages,
          { role: 'assistant', content: data.message },
        ]);
      } else {
        setMessages([
          ...newMessages,
          { role: 'assistant', content: data.message },
        ]);
      }
    } catch {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: '오류가 발생했습니다. 다시 말씀해주세요.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleConfirmQuest = async () => {
    if (!parsedQuest || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: parsedQuest.title,
          description: parsedQuest.description,
          sub_quests: [
            ...parsedQuest.main_quests.map((d) => ({ description: d, is_main: true })),
            ...parsedQuest.sub_quests.map((d) => ({ description: d, is_main: false })),
          ],
        }),
      });

      const { quest } = await res.json();
      router.push(`/quests/${quest.id}`);
    } catch {
      setSubmitting(false);
    }
  };

  const handleEditQuest = () => {
    setEditing(true);
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: '어떤 부분을 수정할까요?' },
    ]);
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col">
      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-muted-soft p-4">
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-primary text-white'
                    : 'bg-surface text-foreground shadow-sm border border-border'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* 타이핑 인디케이터 */}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 퀘스트 미리보기 */}
        {parsedQuest && (
          <div className="mt-4">
            <QuestPreview
              quest={parsedQuest}
              onConfirm={handleConfirmQuest}
              onEdit={handleEditQuest}
              submitting={submitting}
            />
          </div>
        )}
      </div>

      {/* 입력 영역 */}
      {(!parsedQuest || editing) && (
        <div className="mt-3 flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="보고 싶은 영상을 설명해주세요..."
            rows={1}
            disabled={loading}
            className="flex-1 resize-none rounded-xl border border-border bg-surface text-foreground px-4 py-3 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
          >
            전송
          </button>
        </div>
      )}
    </div>
  );
}
