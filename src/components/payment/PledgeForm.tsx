'use client';

import { useState } from 'react';
import { loadTossPayments } from '@tosspayments/tosspayments-sdk';

const CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!;

interface PledgeFormProps {
  questId: string;
  questTitle: string;
  userId: string;
  userEmail: string;
  userName: string;
}

const PRESET_AMOUNTS = [1000, 3000, 5000, 10000, 30000, 50000];

export function PledgeForm({ questId, questTitle, userId, userEmail, userName }: PledgeFormProps) {
  const [amount, setAmount] = useState(5000);
  const [customAmount, setCustomAmount] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actualAmount = useCustom ? parseInt(customAmount, 10) || 0 : amount;
  const platformFee = Math.round(actualAmount * 10 / 100);
  const pgFee = Math.round((actualAmount + platformFee) * 33 / 1000);
  const totalPaid = actualAmount + platformFee + pgFee;

  const handlePay = async () => {
    if (actualAmount < 1000) {
      setError('최소 후원 금액은 1,000원입니다.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. 서버에 pledge 생성
      const res = await fetch('/api/payments/pledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quest_id: questId, amount: actualAmount }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error);
        setLoading(false);
        return;
      }

      const { orderId, totalPaid: serverTotal, orderName } = await res.json();

      // 2. 토스페이먼츠 SDK 로드 + 결제 요청
      const tossPayments = await loadTossPayments(CLIENT_KEY);
      const payment = tossPayments.payment({ customerKey: userId });

      await payment.requestPayment({
        method: 'CARD',
        amount: { value: serverTotal, currency: 'KRW' },
        orderId,
        orderName,
        successUrl: `${window.location.origin}/payments/success`,
        failUrl: `${window.location.origin}/payments/fail`,
        customerEmail: userEmail,
        customerName: userName,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '결제 요청 실패';
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-medium text-foreground">후원 금액 (크리에이터 수령액)</h3>

        {/* 프리셋 금액 */}
        <div className="mb-3 grid grid-cols-3 gap-2">
          {PRESET_AMOUNTS.map((preset) => (
            <button
              key={preset}
              onClick={() => { setAmount(preset); setUseCustom(false); }}
              className={`rounded-lg py-2.5 text-sm font-medium transition-colors ${
                !useCustom && amount === preset
                  ? 'bg-primary text-white'
                  : 'bg-muted-soft text-foreground hover:bg-primary-soft'
              }`}
            >
              {preset.toLocaleString()}원
            </button>
          ))}
        </div>

        {/* 직접 입력 */}
        <div className="flex gap-2">
          <input
            type="number"
            value={customAmount}
            onChange={(e) => { setCustomAmount(e.target.value); setUseCustom(true); }}
            onFocus={() => setUseCustom(true)}
            placeholder="직접 입력"
            min={1000}
            step={1000}
            className="flex-1 rounded-lg border border-border bg-surface text-foreground px-3 py-2.5 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <span className="flex items-center text-sm text-muted">원</span>
        </div>
      </div>

      {/* 금액 상세 */}
      {actualAmount >= 1000 && (
        <div className="rounded-xl bg-muted-soft p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">크리에이터 보상</span>
            <span className="text-foreground">{actualAmount.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">플랫폼 수수료 (10%)</span>
            <span className="text-foreground">{platformFee.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">PG 수수료</span>
            <span className="text-foreground">{pgFee.toLocaleString()}원</span>
          </div>
          <div className="border-t border-border pt-2 flex justify-between font-medium">
            <span className="text-foreground">총 결제 금액</span>
            <span className="text-primary-text">{totalPaid.toLocaleString()}원</span>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-accent-soft px-4 py-3 text-sm text-accent-text">
          {error}
        </div>
      )}

      <button
        onClick={handlePay}
        disabled={loading || actualAmount < 1000}
        className="w-full rounded-xl bg-primary py-3 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
      >
        {loading ? '결제 진행 중...' : `${totalPaid.toLocaleString()}원 후원하기`}
      </button>

      <p className="text-center text-xs text-muted">
        결제 금액 중 {actualAmount.toLocaleString()}원이 크리에이터에게 전달됩니다
      </p>
    </div>
  );
}
