import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 최신 오픈 퀘스트 3개
  const { data: quests } = await supabase
    .from('quests')
    .select('id, title, description, creator_reward_amount, total_pledged_amount')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(3);

  return (
    <div className="min-h-screen bg-background">
      {/* 네비게이션 */}
      <nav className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold text-primary">
            filmit
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/quests" className="text-sm text-muted hover:text-foreground">
              퀘스트
            </Link>
            {user ? (
              <Link
                href="/creator/dashboard"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
              >
                대시보드
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
              >
                로그인
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* 히어로 */}
      <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <h1 className="mb-4 text-4xl font-bold leading-tight text-foreground sm:text-5xl">
          유튜버님!<br />
          <span className="text-primary">이 영상 만들어 주세요</span> :)
        </h1>
        <p className="mx-auto mb-8 max-w-xl text-lg text-muted">
          시청자가 원하는 영상 주제를 퀘스트로 등록하면,<br />
          크리에이터가 제작하고 보상을 받는 영상 후원 플랫폼
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/quests/new"
            className="rounded-xl bg-primary px-8 py-3 text-sm font-medium text-white hover:bg-primary-hover"
          >
            퀘스트 등록하기
          </Link>
          <Link
            href="/creator"
            className="rounded-xl border border-border px-8 py-3 text-sm font-medium text-foreground hover:bg-muted-soft"
          >
            크리에이터로 시작
          </Link>
        </div>
      </section>

      {/* 서비스 설명 */}
      <section className="border-t border-border bg-surface py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-10 text-center text-2xl font-bold text-foreground">어떻게 작동하나요?</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="rounded-2xl bg-background p-6 text-center ring-1 ring-border">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-xl font-bold text-primary-text">
                1
              </div>
              <h3 className="mb-2 font-semibold text-foreground">퀘스트 등록</h3>
              <p className="text-sm text-muted">
                보고 싶은 영상 주제를 등록하고 후원금을 걸어주세요. AI가 유사한 요청을 자동으로 묶어줍니다.
              </p>
            </div>
            <div className="rounded-2xl bg-background p-6 text-center ring-1 ring-border">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-xl font-bold text-primary-text">
                2
              </div>
              <h3 className="mb-2 font-semibold text-foreground">크리에이터 도전</h3>
              <p className="text-sm text-muted">
                크리에이터가 퀘스트를 수락하고 영상을 제작합니다. 후원금은 에스크로로 안전하게 보관됩니다.
              </p>
            </div>
            <div className="rounded-2xl bg-background p-6 text-center ring-1 ring-border">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-xl font-bold text-primary-text">
                3
              </div>
              <h3 className="mb-2 font-semibold text-foreground">보상 지급</h3>
              <p className="text-sm text-muted">
                영상이 조건에 맞으면 크리에이터에게 보상이 지급됩니다. 영상 저작권은 100% 크리에이터 소유!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 최신 퀘스트 */}
      {quests && quests.length > 0 && (
        <section className="py-16">
          <div className="mx-auto max-w-5xl px-6">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">최신 퀘스트</h2>
              <Link href="/quests" className="text-sm font-medium text-primary-text hover:underline">
                전체 보기 →
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {quests.map((quest) => (
                <Link
                  key={quest.id}
                  href={`/quests/${quest.id}`}
                  className="rounded-xl bg-surface p-5 ring-1 ring-border transition-shadow hover:shadow-md"
                >
                  <h3 className="mb-2 font-semibold text-foreground line-clamp-1">{quest.title}</h3>
                  <p className="mb-3 text-sm text-muted line-clamp-2">{quest.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-primary-text">
                      {quest.creator_reward_amount.toLocaleString()}원
                    </span>
                    <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary-text">
                      모집 중
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 푸터 */}
      <footer className="border-t border-border bg-surface py-8">
        <div className="mx-auto max-w-5xl px-6 text-center text-sm text-muted">
          <p>filmit — 보고 싶은 영상을 현실로</p>
        </div>
      </footer>
    </div>
  );
}
