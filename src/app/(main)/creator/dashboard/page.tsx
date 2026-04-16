import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CreatorDashboard } from '@/components/creator/CreatorDashboard';

export const metadata = {
  title: '크리에이터 대시보드 — filmit',
};

export default async function CreatorDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: creator } = await supabase
    .from('creators')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!creator) {
    redirect('/creator');
  }

  // 도전 가능한 퀘스트 수
  const { count: openQuests } = await supabase
    .from('quests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'open');

  return (
    <CreatorDashboard
      creator={creator}
      openQuestCount={openQuests ?? 0}
    />
  );
}
