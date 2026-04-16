import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';

// POST /api/payments/pledge — 후원(pledge) 생성 + 주문 ID 발급
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { quest_id, amount } = await request.json() as {
    quest_id: string;
    amount: number;
  };

  if (!quest_id || !amount || amount < 1000) {
    return NextResponse.json({ error: '퀘스트 ID와 최소 1,000원 이상의 금액이 필요합니다.' }, { status: 400 });
  }

  // 퀘스트 존재 + open 상태 확인
  const { data: quest, error: questError } = await supabase
    .from('quests')
    .select('id, title, status')
    .eq('id', quest_id)
    .single();

  if (questError || !quest) {
    return NextResponse.json({ error: '퀘스트를 찾을 수 없습니다.' }, { status: 404 });
  }

  if (quest.status !== 'open') {
    return NextResponse.json({ error: '모집 중인 퀘스트만 후원할 수 있습니다.' }, { status: 400 });
  }

  // 수수료 계산 (시청자 10%)
  // 금액 = 크리에이터 보상분, 플랫폼 수수료 = 10%, PG 수수료 ≈ 3.3%
  const platformFee = Math.round(amount * 10 / 100);
  const pgFee = Math.round((amount + platformFee) * 33 / 1000);
  const totalPaid = amount + platformFee + pgFee;

  const orderId = `filmit_${randomUUID().replace(/-/g, '').slice(0, 20)}`;

  const { data: pledge, error } = await supabase
    .from('pledges')
    .insert({
      quest_id,
      user_id: user.id,
      amount,
      platform_fee: platformFee,
      pg_fee: pgFee,
      total_paid: totalPaid,
      order_id: orderId,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    pledge,
    orderId,
    totalPaid,
    orderName: quest.title,
  }, { status: 201 });
}
