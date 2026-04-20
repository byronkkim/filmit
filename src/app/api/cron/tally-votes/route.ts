import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { judgeVerification } from '@/lib/voting';

/**
 * GET /api/cron/tally-votes
 * 투표 기간 종료된 영상들을 집계하여 판정 확정
 *
 * 매시간 Vercel Cron이 호출
 *
 * 처리 흐름:
 * 1. vote_deadline_at < now && status in (manual_review, verifying, uploaded) 영상 조회
 * 2. 각 영상에 대해:
 *    - 총 후원자 수 집계
 *    - video_votes의 yes/no 집계
 *    - AI 판정 점수 + 후원자 투표 → 최종 판정 (승인/거부)
 *    - 영상 상태 업데이트 (approved/rejected)
 *    - 퀘스트 상태 업데이트 (completed/cancelled)
 *    - 서브퀘스트별 별 부여 (star_votes_yes > star_votes_no)
 * 3. 정산/환불은 별도 cron에서 처리 (step 5)
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const now = new Date().toISOString();

  // 1. 투표 기간 종료된 영상 조회
  const { data: videos, error } = await supabase
    .from('videos')
    .select('id, quest_id, ai_verification_score, status, vote_deadline_at')
    .in('status', ['uploaded', 'verifying', 'manual_review'])
    .lt('vote_deadline_at', now)
    .not('vote_deadline_at', 'is', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!videos || videos.length === 0) {
    return NextResponse.json({ processed: 0, message: '집계할 영상이 없습니다.' });
  }

  const results: Array<{ video_id: string; approved: boolean; reason: string }> = [];

  for (const video of videos) {
    // 2. 총 후원자 수
    const { count: totalBackers } = await supabase
      .from('pledges')
      .select('id', { count: 'exact', head: true })
      .eq('quest_id', video.quest_id)
      .in('status', ['escrowed', 'pending']);

    // 3. 메인 영상 투표 집계
    const { data: votes } = await supabase
      .from('video_votes')
      .select('vote')
      .eq('video_id', video.id);

    const yesCount = votes?.filter(v => v.vote).length ?? 0;
    const noCount = votes?.filter(v => !v.vote).length ?? 0;

    // 4. 판정 매트릭스 적용
    const aiApproved = (video.ai_verification_score ?? 0) >= 70;
    const judgment = judgeVerification({
      aiApproved,
      totalBackers: totalBackers ?? 0,
      explicitNoVotes: noCount,
    });

    // 5. 영상 상태 업데이트
    await supabase
      .from('videos')
      .update({
        status: judgment.approved ? 'approved' : 'rejected',
        vote_yes: yesCount,
        vote_no: noCount,
        published_at: judgment.approved ? now : null,
      })
      .eq('id', video.id);

    // 6. 퀘스트 상태 업데이트
    // 승인 → completed (정산)
    // 거부 → cancelled (환불, 재도전 안 함)
    await supabase
      .from('quests')
      .update({
        status: judgment.approved ? 'completed' : 'cancelled',
        completed_at: judgment.approved ? now : null,
        // creator_id는 유지 (어뷰징 추적 + 통계용)
      })
      .eq('id', video.quest_id);

    // 7. 서브퀘스트 별 부여 (영상 승인 여부와 무관하게 투표 집계)
    const { data: subQuests } = await supabase
      .from('sub_quests')
      .select('id, is_main')
      .eq('quest_id', video.quest_id);

    for (const sq of subQuests ?? []) {
      if (sq.is_main) continue;  // 메인 조건은 별 대상 아님

      const { data: sqVotes } = await supabase
        .from('sub_quest_votes')
        .select('vote')
        .eq('sub_quest_id', sq.id);

      const sqYes = sqVotes?.filter(v => v.vote).length ?? 0;
      const sqNo = sqVotes?.filter(v => !v.vote).length ?? 0;
      const achieved = sqYes > sqNo;  // 명시적 다수결 (동수면 미달성)

      await supabase
        .from('sub_quests')
        .update({
          star_votes_yes: sqYes,
          star_votes_no: sqNo,
          status: achieved ? 'achieved' : 'failed',
        })
        .eq('id', sq.id);
    }

    // 8. 크리에이터 통계 업데이트 (승인 시만)
    if (judgment.approved) {
      const { data: quest } = await supabase
        .from('quests')
        .select('creator_id')
        .eq('id', video.quest_id)
        .single();

      if (quest?.creator_id) {
        const { data: creator } = await supabase
          .from('creators')
          .select('completed_quests, achievement_rate')
          .eq('id', quest.creator_id)
          .single();

        if (creator) {
          const newCompleted = creator.completed_quests + 1;
          // 달성률 재계산: completed / (completed + abandoned + rejected_cnt)
          // 단순화: 일단 completed_quests만 +1
          await supabase
            .from('creators')
            .update({ completed_quests: newCompleted })
            .eq('id', quest.creator_id);
        }
      }
    }

    results.push({
      video_id: video.id,
      approved: judgment.approved,
      reason: judgment.reason,
    });
  }

  const approvedCount = results.filter(r => r.approved).length;
  const rejectedCount = results.filter(r => !r.approved).length;

  return NextResponse.json({
    processed: results.length,
    approved: approvedCount,
    rejected: rejectedCount,
    details: results,
  });
}
