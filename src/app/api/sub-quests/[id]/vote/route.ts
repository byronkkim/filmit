import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/sub-quests/[id]/vote
 * 서브퀘스트 달성 여부 투표 (별 부여용)
 *
 * 권한: 해당 퀘스트에 후원 기록이 있는 사용자
 * 1인 1표 per 서브퀘스트
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: subQuestId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { vote } = await request.json() as { vote: boolean };

  if (typeof vote !== 'boolean') {
    return NextResponse.json({ error: '올바른 투표 값이 아닙니다.' }, { status: 400 });
  }

  // 서브퀘스트 조회 → 소속 퀘스트 확인
  const { data: subQuest } = await supabase
    .from('sub_quests')
    .select('id, quest_id, is_main')
    .eq('id', subQuestId)
    .single();

  if (!subQuest) {
    return NextResponse.json({ error: '서브퀘스트를 찾을 수 없습니다.' }, { status: 404 });
  }

  // 메인 조건은 투표 대상 아님
  if (subQuest.is_main) {
    return NextResponse.json(
      { error: '필수 조건은 메인 영상 투표로 판정됩니다.' },
      { status: 400 }
    );
  }

  // 해당 퀘스트 후원 기록 확인
  const { data: pledge } = await supabase
    .from('pledges')
    .select('id')
    .eq('quest_id', subQuest.quest_id)
    .eq('user_id', user.id)
    .in('status', ['escrowed', 'pending'])
    .maybeSingle();

  if (!pledge) {
    return NextResponse.json(
      { error: '이 퀘스트에 후원한 사람만 투표할 수 있습니다.' },
      { status: 403 }
    );
  }

  // Upsert
  const { error } = await supabase
    .from('sub_quest_votes')
    .upsert(
      {
        sub_quest_id: subQuestId,
        user_id: user.id,
        vote,
      },
      { onConflict: 'sub_quest_id,user_id' }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, vote });
}
