import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { QuestCreator } from '@/components/quest/QuestCreator';

export const metadata = {
  title: '퀘스트 등록 — filmit',
};

export default async function NewQuestPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="mx-auto max-w-2xl">
      <QuestCreator />
    </div>
  );
}
