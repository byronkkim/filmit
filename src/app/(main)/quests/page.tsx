import { createClient } from '@/lib/supabase/server';
import { QuestCard } from '@/components/quest/QuestCard';
import Link from 'next/link';

export const metadata = {
  title: '퀘스트 찾기 — filmit',
};

export default async function QuestsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const { search, page: pageParam } = await searchParams;
  const supabase = await createClient();
  const page = parseInt(pageParam ?? '1', 10);
  const limit = 12;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('quests')
    .select('*, sub_quests(id, description, is_main, status, star_votes_yes, star_votes_no)', { count: 'exact' })
    .eq('status', 'open')
    .eq('is_private', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.ilike('title', `%${search}%`);
  }

  const { data: quests, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / limit);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">퀘스트 찾기</h1>
          <p className="mt-1 text-sm text-muted">
            원하는 영상을 요청하고 크리에이터를 후원하세요
          </p>
        </div>
        <Link
          href="/quests/new"
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
        >
          영상 만들어주세요
        </Link>
      </div>

      {/* 검색 */}
      <form className="mb-6">
        <input
          type="text"
          name="search"
          defaultValue={search ?? ''}
          placeholder="퀘스트 검색..."
          className="w-full rounded-xl border border-border bg-surface text-foreground px-4 py-3 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </form>

      {/* 퀘스트 그리드 */}
      {quests && quests.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quests.map((quest) => (
            <QuestCard key={quest.id} quest={quest} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-muted">아직 등록된 퀘스트가 없습니다.</p>
          <Link
            href="/quests/new"
            className="mt-3 inline-block text-sm font-medium text-primary-text hover:text-primary-hover"
          >
            첫 퀘스트를 등록해보세요
          </Link>
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/quests?page=${p}${search ? `&search=${search}` : ''}`}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium ${
                p === page
                  ? 'bg-primary text-white'
                  : 'bg-muted-soft text-muted hover:text-foreground'
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
