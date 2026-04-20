import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyVideoAgainstQuest } from '@/lib/gemini';

/**
 * POST /api/videos/[id]/verify-ai
 * Gemini로 영상 AI 판정 수행 (service_role로 실행)
 *
 * 인증:
 *  - 영상 제출 직후 서버 내부에서 호출되는 경우: CRON_SECRET 또는 SUPABASE_SERVICE_ROLE_KEY 체크
 *  - 관리자 재실행 기능 필요 시: 추후 admin 권한 체크 추가
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: videoId } = await params;

  // 내부 호출만 허용 (CRON_SECRET 헤더 검증)
  const authHeader = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // service_role 클라이언트 (RLS 우회)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // 영상 + 퀘스트 + 서브퀘스트 조회
  const { data: video } = await supabase
    .from('videos')
    .select(`
      id, video_url, quest_id, status,
      quest:quests(id, title, description,
        sub_quests(id, description, is_main)
      )
    `)
    .eq('id', videoId)
    .single();

  if (!video) {
    return NextResponse.json({ error: '영상을 찾을 수 없습니다.' }, { status: 404 });
  }

  // 이미 검증 완료된 경우 건너뜀
  if (video.status !== 'uploaded' && video.status !== 'verifying') {
    return NextResponse.json({ error: '이미 검증이 완료된 영상입니다.', current_status: video.status }, { status: 400 });
  }

  type QuestWithSubs = { id: string; title: string; description: string; sub_quests: Array<{ id: string; description: string; is_main: boolean }> };
  const quest = video.quest as unknown as QuestWithSubs;
  if (!quest) {
    return NextResponse.json({ error: '연결된 퀘스트를 찾을 수 없습니다.' }, { status: 500 });
  }

  // verifying 상태로 변경
  await supabase
    .from('videos')
    .update({ status: 'verifying' })
    .eq('id', videoId);

  const mainConditions = quest.sub_quests.filter(sq => sq.is_main).map(sq => sq.description);
  const subQuestsInput = quest.sub_quests.filter(sq => !sq.is_main).map(sq => ({
    id: sq.id,
    description: sq.description,
  }));

  // Gemini 호출
  let result;
  try {
    result = await verifyVideoAgainstQuest({
      videoUrl: video.video_url,
      questTitle: quest.title,
      questDescription: quest.description,
      mainConditions,
      subQuests: subQuestsInput,
    });
  } catch (err) {
    console.error('Gemini 영상 분석 실패:', err);
    const msg = err instanceof Error ? err.message : 'AI 분석 실패';
    // manual_review로 플래그 (투표만으로 판정)
    await supabase
      .from('videos')
      .update({
        status: 'manual_review',
        ai_verification_result: { error: msg },
      })
      .eq('id', videoId);
    return NextResponse.json({ error: msg, fallback: 'manual_review' }, { status: 500 });
  }

  // 결과 저장
  await supabase
    .from('videos')
    .update({
      ai_verification_score: result.main_match_score,
      ai_verification_result: {
        main_reason: result.main_reason,
        main_highlights: result.main_highlights,
        sub_quest_checks: result.sub_quest_checks,
      },
      // AI 점수에 따라 상태는 유지: 최종 판정은 투표 집계 Cron에서 결정
      status: 'manual_review',  // 투표 집계까지 대기 상태
    })
    .eq('id', videoId);

  return NextResponse.json({
    video_id: videoId,
    ...result,
  });
}
