import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cancelPayment } from '@/lib/tosspayments';
import { calculateWithholdingTax, calculateNetAmount } from '@/lib/tax';

/**
 * GET /api/cron/process-settlements
 * 판정 확정된 퀘스트의 정산/환불 처리
 *
 * 매시간 5분에 실행 (tally-votes 이후)
 *
 * 처리:
 * - completed 퀘스트 → settlements 기록 + pledges.status = released
 * - cancelled 퀘스트 → 토스 환불 API 호출 + pledges.status = refunded
 *
 * Phase 1: DB 기록만 (실제 크리에이터 계좌 송금은 수동)
 * Phase 2: 팝빌 API 연동 후 자동화
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const stats = {
    settlements_created: 0,
    settlements_failed: 0,
    refunds_processed: 0,
    refunds_failed: 0,
    errors: [] as string[],
  };

  // ============================================================
  // 1. 정산 처리: completed 퀘스트 + 아직 released 안 된 pledges
  // ============================================================
  const { data: completedQuests } = await supabase
    .from('quests')
    .select('id, creator_id, completed_at')
    .eq('status', 'completed');

  if (completedQuests && completedQuests.length > 0) {
    for (const quest of completedQuests) {
      if (!quest.creator_id) continue;

      // 이 퀘스트의 escrowed pledges 조회 (아직 정산 안 된 것)
      const { data: pledges } = await supabase
        .from('pledges')
        .select('id, amount, user_id')
        .eq('quest_id', quest.id)
        .eq('status', 'escrowed');

      if (!pledges || pledges.length === 0) continue;

      for (const pledge of pledges) {
        try {
          // 이미 settlement 레코드가 있는지 중복 체크
          const { data: existing } = await supabase
            .from('settlements')
            .select('id')
            .eq('pledge_id', pledge.id)
            .maybeSingle();

          if (existing) continue;

          // 원천징수 계산
          const grossAmount = pledge.amount;
          const withholdingTax = calculateWithholdingTax(grossAmount);
          const netAmount = calculateNetAmount(grossAmount);

          // settlements 레코드 생성
          const { error: settlementError } = await supabase
            .from('settlements')
            .insert({
              pledge_id: pledge.id,
              creator_id: quest.creator_id,
              gross_amount: grossAmount,
              withholding_tax: withholdingTax,
              net_amount: netAmount,
              status: 'pending',  // 실제 이체는 수동/나중에
            });

          if (settlementError) {
            stats.settlements_failed++;
            stats.errors.push(`settlement insert failed for pledge ${pledge.id}: ${settlementError.message}`);
            continue;
          }

          // pledges 상태 업데이트
          await supabase
            .from('pledges')
            .update({ status: 'released' })
            .eq('id', pledge.id);

          stats.settlements_created++;
        } catch (err) {
          stats.settlements_failed++;
          const msg = err instanceof Error ? err.message : String(err);
          stats.errors.push(`pledge ${pledge.id}: ${msg}`);
        }
      }
    }
  }

  // ============================================================
  // 2. 환불 처리: cancelled 퀘스트 + 아직 환불 안 된 pledges
  // ============================================================
  const { data: cancelledQuests } = await supabase
    .from('quests')
    .select('id, title')
    .eq('status', 'cancelled');

  if (cancelledQuests && cancelledQuests.length > 0) {
    for (const quest of cancelledQuests) {
      const { data: pledges } = await supabase
        .from('pledges')
        .select('id, payment_key, total_paid, status')
        .eq('quest_id', quest.id)
        .eq('status', 'escrowed');

      if (!pledges || pledges.length === 0) continue;

      for (const pledge of pledges) {
        if (!pledge.payment_key) {
          stats.refunds_failed++;
          stats.errors.push(`pledge ${pledge.id}: payment_key 없음`);
          continue;
        }

        try {
          // 토스페이먼츠 전액 환불
          await cancelPayment(
            pledge.payment_key,
            `퀘스트 "${quest.title}" 판정 거부에 따른 환불`,
          );

          // pledges 상태 업데이트
          await supabase
            .from('pledges')
            .update({
              status: 'refunded',
              refunded_at: new Date().toISOString(),
              refund_amount: pledge.total_paid,
            })
            .eq('id', pledge.id);

          stats.refunds_processed++;
        } catch (err) {
          stats.refunds_failed++;
          const msg = err instanceof Error ? err.message : String(err);
          stats.errors.push(`pledge ${pledge.id} 환불 실패: ${msg}`);
        }
      }
    }
  }

  return NextResponse.json(stats);
}
