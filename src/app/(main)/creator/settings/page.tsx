import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CreatorSettings } from '@/components/creator/CreatorSettings';

export const metadata = {
  title: '크리에이터 설정 — filmit',
};

export default async function CreatorSettingsPage() {
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

  return <CreatorSettings creator={creator} />;
}
