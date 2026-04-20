import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/videos/[id]/vote
 * 후원자가 영상이 퀘스트 주제에 맞는지 투표
 *
 * 권한: 해당 퀘스트에 후원 기록이 있는 사용자
 * 1인 1표 (upsert: 마음 변경 가능)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: videoId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { vote } = await request.json() as { vote: boolean };

  if (typeof vote !== 'boolean') {
    return NextResponse.json({ error: '올바른 투표 값이 아닙니다.' }, { status: 400 });
  }

  // 영상 조회 + 퀘스트 확인
  const { data: video } = await supabase
    .from('videos')
    .select('id, quest_id, vote_deadline_at')
    .eq('id', videoId)
    .single();

  if (!video) {
    return NextResponse.json({ error: '영상을 찾을 수 없습니다.' }, { status: 404 });
  }

  // 투표 기간 종료 체크
  if (video.vote_deadline_at && new Date(video.vote_deadline_at) < new Date()) {
    return NextResponse.json({ error: '투표 기간이 종료되었습니다.' }, { status: 400 });
  }

  // 해당 퀘스트에 후원 기록이 있는지 확인
  const { data: pledge } = await supabase
    .from('pledges')
    .select('id')
    .eq('quest_id', video.quest_id)
    .eq('user_id', user.id)
    .in('status', ['escrowed', 'pending'])
    .maybeSingle();

  if (!pledge) {
    return NextResponse.json(
      { error: '이 퀘스트에 후원한 사람만 투표할 수 있습니다.' },
      { status: 403 }
    );
  }

  // Upsert: 기존 투표 있으면 갱신, 없으면 생성
  const { error } = await supabase
    .from('video_votes')
    .upsert(
      {
        video_id: videoId,
        user_id: user.id,
        vote,
      },
      { onConflict: 'video_id,user_id' }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, vote });
}

/**
 * GET /api/videos/[id]/vote
 * 현재 사용자의 투표 상태 + 집계 조회
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: videoId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 집계
  const { data: votes } = await supabase
    .from('video_votes')
    .select('vote')
    .eq('video_id', videoId);

  const yesCount = votes?.filter(v => v.vote).length ?? 0;
  const noCount = votes?.filter(v => !v.vote).length ?? 0;

  // 내 투표
  let myVote: boolean | null = null;
  if (user) {
    const { data: mine } = await supabase
      .from('video_votes')
      .select('vote')
      .eq('video_id', videoId)
      .eq('user_id', user.id)
      .maybeSingle();
    myVote = mine?.vote ?? null;
  }

  return NextResponse.json({
    yes: yesCount,
    no: noCount,
    my_vote: myVote,
  });
}
