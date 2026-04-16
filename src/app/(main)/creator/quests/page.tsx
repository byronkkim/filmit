import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CreatorQuests } from '@/components/creator/CreatorQuests';

export const metadata = {
  title: '내 퀘스트 — filmit',
};

export default async function CreatorQuestsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: creator } = await supabase
    .from('creators')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!creator) {
    redirect('/creator');
  }

  // 크리에이터가 수락한 퀘스트 목록
  const { data: quests } = await supabase
    .from('quests')
    .select(`
      id, title, description, status,
      creator_reward_amount, total_pledged_amount,
      accepted_at, completed_at, deadline_at,
      sub_quests(id, description, is_main, status)
    `)
    .eq('creator_id', creator.id)
    .order('accepted_at', { ascending: false });

  return <CreatorQuests quests={quests ?? []} />;
}
