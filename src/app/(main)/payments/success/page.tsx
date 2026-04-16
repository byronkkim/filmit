'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const paymentKey = searchParams.get('paymentKey');
    const orderId = searchParams.get('orderId');
    const amount = searchParams.get('amount');

    if (!paymentKey || !orderId || !amount) {
      setStatus('error');
      setErrorMessage('결제 정보가 누락되었습니다.');
      return;
    }

    // 서버에 승인 요청
    fetch('/api/payments/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount: parseInt(amount, 10),
      }),
    })
      .then(async (res) => {
        if (res.ok) {
          setStatus('success');
        } else {
          const data = await res.json();
          setStatus('error');
          setErrorMessage(data.error ?? '결제 승인에 실패했습니다.');
        }
      })
      .catch(() => {
        setStatus('error');
        setErrorMessage('결제 승인 중 오류가 발생했습니다.');
      });
  }, [searchParams]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="text-sm text-muted">결제 승인 중...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft">
          <span className="text-2xl text-accent-text">!</span>
        </div>
        <h1 className="mb-2 text-xl font-bold text-foreground">결제 실패</h1>
        <p className="mb-6 text-sm text-muted">{errorMessage}</p>
        <Link
          href="/quests"
          className="inline-block rounded-xl bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-primary-hover"
        >
          퀘스트 목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft">
        <span className="text-2xl text-primary-text">✓</span>
      </div>
      <h1 className="mb-2 text-xl font-bold text-foreground">후원 완료!</h1>
      <p className="mb-6 text-sm text-muted">
        감사합니다! 크리에이터가 퀘스트를 완료하면 보상이 전달됩니다.
      </p>
      <Link
        href="/quests"
        className="inline-block rounded-xl bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-primary-hover"
      >
        다른 퀘스트 둘러보기
      </Link>
    </div>
  );
}
