import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/cron/expire-quests
 * 데드라인 초과 퀘스트 자동 취소
 *
 * Vercel Cron으로 매일 실행 (vercel.json에 설정)
 * 또는 Supabase pg_cron으로도 가능
 *
 * 인증: CRON_SECRET 환경변수와 헤더 비교
 */
export async function GET(request: NextRequest) {
  // Cron 인증
  const authHeader = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // service_role 클라이언트 (RLS 우회 필요)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const now = new Date().toISOString();

  // 1. 데드라인 초과 + in_progress 상태 퀘스트 조회
  const { data: overdueQuests, error: fetchError } = await supabase
    .from('quests')
    .select('id, creator_id')
    .eq('status', 'in_progress')
    .lt('deadline_at', now)
    .not('deadline_at', 'is', null);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!overdueQuests || overdueQuests.length === 0) {
    return NextResponse.json({ expired: 0, message: '취소할 퀘스트가 없습니다.' });
  }

  // 2. 퀘스트 다시 open 상태로 되돌리기
  const questIds = overdueQuests.map(q => q.id);
  const { error: updateError } = await supabase
    .from('quests')
    .update({
      status: 'open',
      creator_id: null,
      accepted_at: null,
      deadline_at: null,
    })
    .in('id', questIds);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // 3. 해당 크리에이터들에게 패널티 부여
  const creatorIds = [...new Set(overdueQuests.map(q => q.creator_id).filter(Boolean))] as string[];

  for (const creatorId of creatorIds) {
    const abandonedCount = overdueQuests.filter(q => q.creator_id === creatorId).length;

    // 현재 크리에이터 상태 조회
    const { data: creator } = await supabase
      .from('creators')
      .select('abandoned_quests')
      .eq('id', creatorId)
      .single();

    if (!creator) continue;

    const newAbandonedCount = creator.abandoned_quests + abandonedCount;

    // 3회 누적되면 30일 제재
    const updates: { abandoned_quests: number; suspended_until?: string } = {
      abandoned_quests: newAbandonedCount,
    };

    if (newAbandonedCount >= 3) {
      const suspendedUntil = new Date();
      suspendedUntil.setDate(suspendedUntil.getDate() + 30);
      updates.suspended_until = suspendedUntil.toISOString();
    }

    await supabase.from('creators').update(updates).eq('id', creatorId);
  }

  return NextResponse.json({
    expired: overdueQuests.length,
    penalized_creators: creatorIds.length,
    message: `${overdueQuests.length}개 퀘스트 자동 취소, ${creatorIds.length}명의 크리에이터에게 패널티 부여`,
  });
}
