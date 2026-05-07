import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 최신 오픈 퀘스트 12개 (4 x 3)
  const { data: quests } = await supabase
    .from('quests')
    .select('id, title, description, creator_reward_amount, total_pledged_amount')
    .eq('status', 'open')
    .eq('is_private', false)
    .order('created_at', { ascending: false })
    .limit(12);

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
        <div className="flex items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-xs font-medium text-muted">시청자</span>
            <Link
              href="/quests/new"
              className="rounded-xl bg-primary px-8 py-3 text-sm font-medium text-white hover:bg-primary-hover"
            >
              퀘스트 등록
            </Link>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-xs font-medium text-muted">크리에이터</span>
            <Link
              href="/creator"
              className="rounded-xl border border-border px-8 py-3 text-sm font-medium text-foreground hover:bg-muted-soft"
            >
              퀘스트 수령
            </Link>
          </div>
        </div>
      </section>

      {/* 퀘스트 리스트 */}
      <section className="border-t border-border bg-surface py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">진행 중인 퀘스트</h2>
            <Link href="/quests" className="text-sm font-medium text-primary-text hover:underline">
              전체 보기 →
            </Link>
          </div>

          {quests && quests.length > 0 ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {quests.map((quest) => (
                  <Link
                    key={quest.id}
                    href={`/quests/${quest.id}`}
                    className="rounded-xl bg-background p-5 ring-1 ring-border transition-shadow hover:shadow-md"
                  >
                    <h3 className="mb-2 font-semibold text-foreground line-clamp-1">{quest.title}</h3>
                    <p className="mb-3 text-sm text-muted line-clamp-2 min-h-[40px]">{quest.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-primary-text">
                        {quest.creator_reward_amount.toLocaleString()}원
                      </span>
                      <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary-text">
                        모집 중
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="mt-8 flex justify-center">
                <Link
                  href="/quests"
                  className="rounded-xl border border-border bg-background px-8 py-3 text-sm font-medium text-foreground hover:bg-muted-soft"
                >
                  더 보기
                </Link>
              </div>
            </>
          ) : (
            <div className="rounded-2xl bg-background p-12 text-center ring-1 ring-border">
              <p className="mb-4 text-muted">아직 등록된 퀘스트가 없어요</p>
              <Link
                href="/quests/new"
                className="inline-block rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
              >
                첫 퀘스트 등록하기
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* 푸터 */}
      <footer className="border-t border-border bg-surface py-8">
        <div className="mx-auto max-w-5xl px-6 text-center text-sm text-muted">
          <p>filmit — 보고 싶은 영상을 현실로</p>
        </div>
      </footer>
    </div>
  );
}
