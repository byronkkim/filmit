'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface CreatorKYCProps {
  /** 이미 인증 완료인 경우 */
  kycVerified?: boolean;
  kycType?: string | null;
  kycVerifiedAt?: string | null;
  /** 온보딩 플로우에서 사용 시 완료 후 콜백 */
  onComplete?: () => void;
}

export function CreatorKYC({ kycVerified, kycType, kycVerifiedAt, onComplete }: CreatorKYCProps) {
  const router = useRouter();
  const [type, setType] = useState<'individual' | 'business'>('individual');
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 이미 인증 완료
  if (kycVerified || success) {
    const displayType = kycType === 'business' ? '사업자' : '개인';
    const displayDate = kycVerifiedAt
      ? new Date(kycVerifiedAt).toLocaleDateString('ko-KR')
      : '방금';

    return (
      <div className="rounded-2xl bg-surface p-6 ring-1 ring-border">
        <h2 className="mb-4 text-lg font-semibold text-foreground">본인인증 (KYC)</h2>
        <div className="rounded-xl border border-success/30 bg-success/5 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
              <svg className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-foreground">인증 완료</p>
              <p className="text-sm text-muted">
                {displayType} · {displayDate} 인증됨
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 주민번호 뒷자리 포맷: 1234567
  const formatIndividual = (v: string) => v.replace(/\D/g, '').slice(0, 7);

  // 사업자번호 포맷: 123-45-67890
  const formatBusiness = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  };

  const handleValueChange = (v: string) => {
    setValue(type === 'individual' ? formatIndividual(v) : formatBusiness(v));
  };

  const isValid = type === 'individual'
    ? /^\d{7}$/.test(value)
    : /^\d{3}-\d{2}-\d{5}$/.test(value);

  const handleSubmit = async () => {
    if (!isValid) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/creators/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kyc_type: type,
          kyc_value: value,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? '인증에 실패했습니다.');
        return;
      }

      setSuccess(true);
      router.refresh();
      onComplete?.();
    } catch {
      setError('예기치 않은 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl bg-surface p-6 ring-1 ring-border">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-foreground">본인인증 (KYC)</h2>
        <p className="mt-1 text-sm text-muted">
          정산을 위해 본인인증이 필요합니다. 입력한 정보는 AES-256으로 암호화되어 안전하게 저장됩니다.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-accent-soft px-4 py-3 text-sm text-accent-text">
          {error}
        </div>
      )}

      {/* 인증 유형 선택 */}
      <div className="mb-5">
        <label className="mb-2 block text-sm font-medium text-foreground">인증 유형</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => { setType('individual'); setValue(''); }}
            className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
              type === 'individual'
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border text-muted hover:border-primary/30'
            }`}
          >
            <div className="text-center">
              <div className="mb-1">👤</div>
              <div>개인 (주민번호)</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => { setType('business'); setValue(''); }}
            className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
              type === 'business'
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border text-muted hover:border-primary/30'
            }`}
          >
            <div className="text-center">
              <div className="mb-1">🏢</div>
              <div>사업자</div>
            </div>
          </button>
        </div>
      </div>

      {/* 입력 필드 */}
      <div className="mb-5">
        <label htmlFor="kyc_value" className="mb-1.5 block text-sm font-medium text-foreground">
          {type === 'individual' ? '주민번호 뒷자리 (7자리)' : '사업자등록번호'}
          <span className="text-accent"> *</span>
        </label>
        <input
          id="kyc_value"
          type={type === 'individual' ? 'password' : 'text'}
          inputMode="numeric"
          value={value}
          onChange={(e) => handleValueChange(e.target.value)}
          placeholder={type === 'individual' ? '뒷 7자리 입력' : '000-00-00000'}
          className="w-full rounded-xl border border-border bg-background text-foreground px-4 py-3 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          autoComplete="off"
        />
        {type === 'individual' && (
          <p className="mt-1.5 text-xs text-muted">
            원천징수 신고를 위해 주민번호 뒷자리가 필요합니다. 앞자리는 수집하지 않습니다.
          </p>
        )}
        {type === 'business' && (
          <p className="mt-1.5 text-xs text-muted">
            세금계산서 발행을 위해 사업자등록번호가 필요합니다.
          </p>
        )}
      </div>

      {/* 안내 */}
      <div className="mb-5 rounded-xl bg-muted-soft/50 p-4 text-xs text-muted space-y-1">
        <p>🔒 입력한 정보는 AES-256-GCM으로 암호화되어 저장됩니다.</p>
        <p>🔒 평문은 서버 메모리에서 즉시 폐기되며, 복호화는 정산 시에만 수행됩니다.</p>
        <p>🔒 개인정보처리방침에 따라 안전하게 관리됩니다.</p>
      </div>

      {/* 제출 */}
      <button
        onClick={handleSubmit}
        disabled={!isValid || submitting}
        className="w-full rounded-xl bg-primary py-3 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
      >
        {submitting ? '인증 중...' : '본인인증 완료'}
      </button>
    </div>
  );
}
