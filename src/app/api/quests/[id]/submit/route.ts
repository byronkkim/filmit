import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchVideoInfo, parseVideoUrl } from '@/lib/youtube';
import { getVotingPeriodMs } from '@/lib/voting';

/**
 * POST /api/quests/[id]/submit
 * 크리에이터가 완성된 YouTube 영상을 제출
 *
 * 어뷰징 방지:
 * 1. 데드라인 초과 체크 (수락 시 설정된 deadline_at)
 * 2. 업로드 날짜 검증 (accepted_at 이후에 업로드된 영상만)
 * 3. 중복 제출 방지 (UNIQUE 제약 + 명시적 체크)
 * 4. 크리에이터 채널 일치 검증 (등록된 채널의 영상이어야 함)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: questId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { video_url } = await request.json() as { video_url: string };

  if (!video_url || !parseVideoUrl(video_url)) {
    return NextResponse.json({ error: '유효한 YouTube 영상 URL을 입력해주세요.' }, { status: 400 });
  }

  // 크리에이터 프로필 확인
  const { data: creator } = await supabase
    .from('creators')
    .select('id, channel_id')
    .eq('user_id', user.id)
    .single();

  if (!creator) {
    return NextResponse.json({ error: '크리에이터 등록이 필요합니다.' }, { status: 403 });
  }

  // 퀘스트 조회
  const { data: quest, error: questError } = await supabase
    .from('quests')
    .select('id, status, creator_id, accepted_at, deadline_at, total_pledged_amount')
    .eq('id', questId)
    .single();

  if (questError || !quest) {
    return NextResponse.json({ error: '퀘스트를 찾을 수 없습니다.' }, { status: 404 });
  }

  if (quest.creator_id !== creator.id) {
    return NextResponse.json({ error: '본인이 수락한 퀘스트만 제출할 수 있습니다.' }, { status: 403 });
  }

  if (quest.status !== 'in_progress') {
    return NextResponse.json({ error: '진행 중인 퀘스트만 영상을 제출할 수 있습니다.' }, { status: 400 });
  }

  // 1. 데드라인 초과 체크
  if (quest.deadline_at && new Date(quest.deadline_at) < new Date()) {
    return NextResponse.json(
      { error: '데드라인을 초과한 퀘스트입니다.' },
      { status: 400 }
    );
  }

  // YouTube 영상 정보 조회
  let videoInfo;
  try {
    videoInfo = await fetchVideoInfo(video_url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'YouTube 영상 조회 실패';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // 4. 크리에이터 채널 일치 검증
  if (creator.channel_id && videoInfo.channel_id !== creator.channel_id) {
    return NextResponse.json(
      { error: '본인 채널의 영상만 제출할 수 있습니다. 등록된 채널과 영상 채널이 다릅니다.' },
      { status: 400 }
    );
  }

  // 2. 업로드 날짜 검증 (accepted_at 이후여야 함)
  if (quest.accepted_at) {
    const acceptedAt = new Date(quest.accepted_at);
    const uploadedAt = new Date(videoInfo.published_at);
    if (uploadedAt < acceptedAt) {
      return NextResponse.json(
        { error: `퀘스트 수락(${acceptedAt.toLocaleDateString('ko-KR')}) 이후에 업로드된 영상만 제출할 수 있습니다. 이 영상은 ${uploadedAt.toLocaleDateString('ko-KR')}에 업로드되었습니다.` },
        { status: 400 }
      );
    }
  }

  // 3. 중복 제출 체크 (다른 퀘스트에 이미 제출된 영상)
  const { data: existingVideo } = await supabase
    .from('videos')
    .select('id, quest_id')
    .eq('youtube_video_id', videoInfo.video_id)
    .single();

  if (existingVideo) {
    return NextResponse.json(
      { error: '이 영상은 이미 다른 퀘스트에 제출되었습니다.' },
      { status: 409 }
    );
  }

  // 투표 기간 설정 (총 후원액 기준 차등)
  const votingPeriodMs = getVotingPeriodMs(quest.total_pledged_amount);
  const voteDeadline = new Date(Date.now() + votingPeriodMs);

  // 영상 레코드 생성
  const { data: video, error: videoError } = await supabase
    .from('videos')
    .insert({
      quest_id: questId,
      creator_id: creator.id,
      video_url,
      youtube_video_id: videoInfo.video_id,
      youtube_published_at: videoInfo.published_at,
      duration_seconds: videoInfo.duration_seconds,
      status: 'uploaded',
      vote_deadline_at: voteDeadline.toISOString(),
    })
    .select()
    .single();

  if (videoError) {
    return NextResponse.json({ error: videoError.message }, { status: 500 });
  }

  // 퀘스트 상태 변경: in_progress → reviewing
  await supabase
    .from('quests')
    .update({ status: 'reviewing' })
    .eq('id', questId);

  return NextResponse.json({
    video,
    message: '영상이 제출되었습니다. 검증이 진행됩니다.',
  }, { status: 201 });
}
