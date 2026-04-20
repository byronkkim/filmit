import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { QuestDetail } from '@/components/quest/QuestDetail';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: quest } = await supabase
    .from('quests')
    .select('title')
    .eq('id', id)
    .single();

  return {
    title: quest ? `${quest.title} — filmit` : '퀘스트 — filmit',
  };
}

export default async function QuestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: quest, error } = await supabase
    .from('quests')
    .select(`
      *,
      sub_quests(id, description, is_main, status, star_votes_yes, star_votes_no),
      creator:creators(id, channel_name, subscriber_count, grade)
    `)
    .eq('id', id)
    .single();

  if (error || !quest) {
    notFound();
  }

  const { data: { user } } = await supabase.auth.getUser();

  const { count: pledgeCount } = await supabase
    .from('pledges')
    .select('id', { count: 'exact', head: true })
    .eq('quest_id', id);

  // 사용자 정보 (후원 폼에 필요)
  let userInfo = null;
  let isCreator = false;
  let currentCreatorId: string | null = null;

  if (user) {
    const { data: dbUser } = await supabase
      .from('users')
      .select('display_name, email')
      .eq('id', user.id)
      .single();
    userInfo = {
      id: user.id,
      email: dbUser?.email ?? user.email ?? '',
      name: dbUser?.display_name ?? '',
    };

    // 크리에이터 여부 + ID 확인
    const { data: creator } = await supabase
      .from('creators')
      .select('id')
      .eq('user_id', user.id)
      .single();
    isCreator = !!creator;
    currentCreatorId = creator?.id ?? null;
  }

  // 이미 제출된 영상이 있는지 확인
  const { data: video } = await supabase
    .from('videos')
    .select('id, youtube_video_id, video_url, status, ai_verification_score, ai_verification_result, vote_deadline_at, created_at')
    .eq('quest_id', id)
    .maybeSingle();

  // 현재 사용자가 후원자인지 (투표권 확인용)
  let isPledger = false;
  if (user) {
    const { data: pledge } = await supabase
      .from('pledges')
      .select('id')
      .eq('quest_id', id)
      .eq('user_id', user.id)
      .in('status', ['escrowed', 'pending'])
      .maybeSingle();
    isPledger = !!pledge;
  }

  return (
    <QuestDetail
      quest={quest}
      video={video}
      pledgeCount={pledgeCount ?? 0}
      currentUserId={user?.id ?? null}
      currentCreatorId={currentCreatorId}
      userInfo={userInfo}
      isCreator={isCreator}
      isPledger={isPledger}
    />
  );
}
