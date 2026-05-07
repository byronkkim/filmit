import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendQuestNominationEmail } from '@/lib/email';

// GET /api/quests — 퀘스트 목록 조회
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = parseInt(searchParams.get('limit') ?? '12', 10);
  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? 'open';

  const offset = (page - 1) * limit;

  let query = supabase
    .from('quests')
    .select('*, sub_quests(id, description, is_main, status)', { count: 'exact' })
    .eq('status', status)
    .eq('is_private', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.ilike('title', `%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    quests: data,
    total: count ?? 0,
    page,
    limit,
  });
}

// POST /api/quests — 새 퀘스트 생성
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const body = await request.json();
  const {
    title, description, sub_quests,
    target_channel_id, target_channel_name, target_channel_thumbnail, target_channel_url,
  } = body as {
    title: string;
    description: string;
    sub_quests: { description: string; is_main: boolean }[];
    target_channel_id?: string | null;
    target_channel_name?: string | null;
    target_channel_thumbnail?: string | null;
    target_channel_url?: string | null;
  };

  if (!title || !description) {
    return NextResponse.json({ error: '제목과 설명은 필수입니다.' }, { status: 400 });
  }

  // 퀘스트 생성
  const { data: quest, error: questError } = await supabase
    .from('quests')
    .insert({
      title,
      description,
      status: 'open',
      target_channel_id: target_channel_id || null,
      target_channel_name: target_channel_name || null,
      target_channel_thumbnail: target_channel_thumbnail || null,
      target_channel_url: target_channel_url || null,
    })
    .select()
    .single();

  if (questError) {
    return NextResponse.json({ error: questError.message }, { status: 500 });
  }

  // 서브퀘스트 생성
  if (sub_quests?.length > 0) {
    const subQuestRows = sub_quests.map((sq) => ({
      quest_id: quest.id,
      description: sq.description,
      is_main: sq.is_main,
    }));

    const { error: subError } = await supabase
      .from('sub_quests')
      .insert(subQuestRows);

    if (subError) {
      return NextResponse.json({ error: subError.message }, { status: 500 });
    }
  }

  // 지명된 채널이 filmit 가입자인지 확인 → 가입자면 자동 이메일
  if (target_channel_id) {
    (async () => {
      try {
        const { data: matchedCreator } = await supabase
          .from('creators')
          .select('id, channel_name, user:users(email)')
          .eq('channel_id', target_channel_id)
          .single();

        if (matchedCreator) {
          type CreatorWithUser = {
            id: string;
            channel_name: string | null;
            user: { email: string } | { email: string }[] | null;
          };
          const c = matchedCreator as unknown as CreatorWithUser;
          const email = Array.isArray(c.user) ? c.user[0]?.email : c.user?.email;
          if (email) {
            await sendQuestNominationEmail({
              to: email,
              channelName: c.channel_name ?? '크리에이터',
              questTitle: title,
              questId: quest.id,
            });
          }
        }
      } catch (err) {
        console.error('지명 알림 실패:', err);
      }
    })();
  }

  return NextResponse.json({ quest }, { status: 201 });
}
