import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/quests/[id] — 퀘스트 상세 조회
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: quest, error } = await supabase
    .from('quests')
    .select(`
      *,
      sub_quests(id, description, is_main, amount, status),
      pledges(id, amount, user_id),
      creator:creators(id, channel_name, subscriber_count, grade)
    `)
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: '퀘스트를 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json({ quest });
}
