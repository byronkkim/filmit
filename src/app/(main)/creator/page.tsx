import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CreatorOnboarding } from '@/components/creator/CreatorOnboarding';

export const metadata = {
  title: '크리에이터 등록 — filmit',
};

export default async function CreatorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 이미 크리에이터 프로필이 있으면 대시보드로
  const { data: creator } = await supabase
    .from('creators')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (creator) {
    redirect('/creator/dashboard');
  }

  return <CreatorOnboarding />;
}
