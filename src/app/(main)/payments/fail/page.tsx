'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function PaymentFailContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code') ?? '';
  const message = searchParams.get('message') ?? '결제가 취소되었습니다.';

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft">
        <span className="text-2xl text-accent-text">✕</span>
      </div>
      <h1 className="mb-2 text-xl font-bold text-foreground">결제 실패</h1>
      <p className="mb-2 text-sm text-muted">{message}</p>
      {code && (
        <p className="mb-6 text-xs text-muted">오류 코드: {code}</p>
      )}
      <Link
        href="/quests"
        className="inline-block rounded-xl bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-primary-hover"
      >
        퀘스트 목록으로
      </Link>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center"><p className="text-sm text-muted">로딩 중...</p></div>}>
      <PaymentFailContent />
    </Suspense>
  );
}
