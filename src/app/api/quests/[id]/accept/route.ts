import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendCreatorAcceptedEmail } from '@/lib/email';

/**
 * POST /api/quests/[id]/accept
 * 크리에이터가 퀘스트를 수락 (도전하기)
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: questId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  // 크리에이터 프로필 확인
  const { data: creator } = await supabase
    .from('creators')
    .select('id, channel_id, suspended_until')
    .eq('user_id', user.id)
    .single();

  if (!creator) {
    return NextResponse.json({ error: '크리에이터 등록이 필요합니다.' }, { status: 403 });
  }

  // 제재 중인 크리에이터는 수락 불가
  if (creator.suspended_until && new Date(creator.suspended_until) > new Date()) {
    const until = new Date(creator.suspended_until).toLocaleDateString('ko-KR');
    return NextResponse.json(
      { error: `${until}까지 새 퀘스트를 수락할 수 없습니다. (데드라인 초과 이력)` },
      { status: 403 }
    );
  }

  // 퀘스트 조회
  const { data: quest, error: questError } = await supabase
    .from('quests')
    .select('id, status, creator_id, is_competitive, target_channel_id')
    .eq('id', questId)
    .single();

  if (questError || !quest) {
    return NextResponse.json({ error: '퀘스트를 찾을 수 없습니다.' }, { status: 404 });
  }

  if (quest.status !== 'open') {
    return NextResponse.json({ error: '현재 수락할 수 없는 퀘스트입니다.' }, { status: 400 });
  }

  if (quest.creator_id && !quest.is_competitive) {
    return NextResponse.json({ error: '이미 다른 크리에이터가 수락한 퀘스트입니다.' }, { status: 409 });
  }

  // 지명 퀘스트는 지명된 채널만 수락 가능
  if (quest.target_channel_id && quest.target_channel_id !== creator.channel_id) {
    return NextResponse.json(
      { error: '이 퀘스트는 특정 크리에이터에게 지명된 퀘스트입니다.' },
      { status: 403 }
    );
  }

  // 데드라인: 수락 시점으로부터 14일 후
  const now = new Date();
  const deadline = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  // 퀘스트 수락: creator_id 설정 + status 변경 + 데드라인 자동 설정
  const { data: updated, error: updateError } = await supabase
    .from('quests')
    .update({
      creator_id: creator.id,
      status: 'in_progress',
      accepted_at: now.toISOString(),
      deadline_at: deadline.toISOString(),
    })
    .eq('id', questId)
    .eq('status', 'open')  // 낙관적 잠금
    .select()
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: '퀘스트 수락에 실패했습니다. 다시 시도해주세요.' }, { status: 500 });
  }

  // 후원자들에게 알림 메일 (실패해도 응답은 OK)
  (async () => {
    try {
      const { data: pledgersData } = await supabase
        .from('pledges')
        .select('user:users(email)')
        .eq('quest_id', questId)
        .in('status', ['escrowed', 'pending']);

      const { data: creatorData } = await supabase
        .from('creators')
        .select('channel_name')
        .eq('id', creator.id)
        .single();

      type PledgerRow = { user: { email: string } | { email: string }[] | null };
      const emails = Array.from(new Set(
        ((pledgersData ?? []) as unknown as PledgerRow[])
          .map(p => Array.isArray(p.user) ? p.user[0]?.email : p.user?.email)
          .filter((e): e is string => !!e)
      ));

      const channelName = creatorData?.channel_name ?? '크리에이터';
      await Promise.allSettled(emails.map(email =>
        sendCreatorAcceptedEmail({
          to: email,
          questTitle: updated.title,
          questId,
          creatorName: channelName,
        })
      ));
    } catch (err) {
      console.error('수락 알림 실패:', err);
    }
  })();

  return NextResponse.json({ quest: updated });
}
