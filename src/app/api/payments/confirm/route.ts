import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { confirmPayment } from '@/lib/tosspayments';

// POST /api/payments/confirm — 결제 승인
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { paymentKey, orderId, amount } = await request.json() as {
    paymentKey: string;
    orderId: string;
    amount: number;
  };

  // 1. 서버에 저장된 주문 금액과 비교 (위변조 방지)
  const { data: pledge, error: pledgeError } = await supabase
    .from('pledges')
    .select('*')
    .eq('order_id', orderId)
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .single();

  if (pledgeError || !pledge) {
    return NextResponse.json({ error: '주문 정보를 찾을 수 없습니다.' }, { status: 404 });
  }

  if (pledge.total_paid !== amount) {
    return NextResponse.json({ error: '결제 금액이 일치하지 않습니다.' }, { status: 400 });
  }

  // 2. 토스페이먼츠 승인 API 호출
  try {
    const payment = await confirmPayment(paymentKey, orderId, amount);

    // 3. pledge 상태 업데이트 + paymentKey 저장
    await supabase
      .from('pledges')
      .update({
        status: 'escrowed',
        payment_key: payment.paymentKey,
      })
      .eq('id', pledge.id);

    // 4. 퀘스트 총 후원액 업데이트
    await supabase.rpc('increment_quest_pledged_amount', {
      quest_id_input: pledge.quest_id,
      amount_input: pledge.amount,
    });

    return NextResponse.json({ success: true, payment });
  } catch (err) {
    const message = err instanceof Error ? err.message : '결제 승인 실패';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
