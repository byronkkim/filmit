'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface ChannelInfo {
  channel_id: string;
  channel_name: string;
  subscriber_count: number;
  categories: string[];
  thumbnail_url: string;
  description: string;
}

const BANKS = [
  { code: '004', name: 'KB국민은행' },
  { code: '088', name: '신한은행' },
  { code: '020', name: '우리은행' },
  { code: '081', name: '하나은행' },
  { code: '011', name: 'NH농협은행' },
  { code: '023', name: 'SC제일은행' },
  { code: '027', name: '씨티은행' },
  { code: '071', name: '우체국' },
  { code: '031', name: '대구은행' },
  { code: '032', name: '부산은행' },
  { code: '034', name: '광주은행' },
  { code: '035', name: '제주은행' },
  { code: '037', name: '전북은행' },
  { code: '039', name: '경남은행' },
  { code: '089', name: '케이뱅크' },
  { code: '090', name: '카카오뱅크' },
  { code: '092', name: '토스뱅크' },
];

interface FormData {
  channel_url: string;
  channel_name: string;
  channel_id: string;
  subscriber_count: number;
  categories: string[];
  bank_code: string;
  account_number: string;
  account_holder: string;
  kyc_type: 'individual' | 'business';
  kyc_value: string;
}

export function CreatorOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({
    channel_url: '',
    channel_name: '',
    channel_id: '',
    subscriber_count: 0,
    categories: [],
    bank_code: '',
    account_number: '',
    account_holder: '',
    kyc_type: 'individual',
    kyc_value: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [channelInfo, setChannelInfo] = useState<ChannelInfo | null>(null);
  const [channelLoading, setChannelLoading] = useState(false);
  const [channelError, setChannelError] = useState<string | null>(null);

  const updateForm = (field: keyof FormData, value: string | number | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // YouTube 채널 URL로 채널 정보 자동 조회
  const fetchChannel = useCallback(async (url: string) => {
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) return;

    setChannelLoading(true);
    setChannelError(null);
    setChannelInfo(null);

    try {
      const res = await fetch(`/api/creators/youtube?url=${encodeURIComponent(url)}`);
      const data = await res.json();

      if (!res.ok) {
        setChannelError(data.error ?? '채널 정보를 가져올 수 없습니다.');
        return;
      }

      const info: ChannelInfo = data.channel;
      setChannelInfo(info);
      setForm((prev) => ({
        ...prev,
        channel_name: info.channel_name,
        channel_id: info.channel_id,
        subscriber_count: info.subscriber_count,
        categories: info.categories,
      }));
    } catch {
      setChannelError('채널 정보를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setChannelLoading(false);
    }
  }, []);

  const handleNext = () => {
    if (step === 1 && !form.channel_url.trim()) {
      setError('채널 URL을 입력해주세요.');
      return;
    }
    setError(null);
    setStep((prev) => prev + 1);
  };

  // 주민번호 뒷자리 포맷
  const formatIndividual = (v: string) => v.replace(/\D/g, '').slice(0, 7);

  // 사업자번호 포맷: 123-45-67890
  const formatBusiness = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  };

  const handleKycValueChange = (v: string) => {
    updateForm(
      'kyc_value',
      form.kyc_type === 'individual' ? formatIndividual(v) : formatBusiness(v)
    );
  };

  const isKycValid = form.kyc_type === 'individual'
    ? /^\d{7}$/.test(form.kyc_value)
    : /^\d{3}-\d{2}-\d{5}$/.test(form.kyc_value);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      // 1. 크리에이터 프로필 생성
      const res = await fetch('/api/creators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? '등록에 실패했습니다.');
        setSubmitting(false);
        return;
      }

      // 2. KYC 정보가 있으면 제출
      if (form.kyc_value && isKycValid) {
        const kycRes = await fetch('/api/creators/kyc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kyc_type: form.kyc_type,
            kyc_value: form.kyc_value,
          }),
        });

        if (!kycRes.ok) {
          // KYC 실패해도 크리에이터 등록은 성공 → 설정에서 재시도 가능
          console.warn('KYC 제출 실패, 설정에서 재시도 가능');
        }
      }

      router.push('/creator/dashboard');
    } catch {
      setError('예기치 않은 오류가 발생했습니다.');
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-foreground">크리에이터 등록</h1>
        <p className="mt-2 text-sm text-muted">
          채널 정보를 입력하고 퀘스트에 도전하세요
        </p>
      </div>

      {/* 스텝 인디케이터 */}
      <div className="mb-8 flex items-center justify-center gap-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
          step >= 1 ? 'bg-primary text-white' : 'bg-muted-soft text-muted'
        }`}>
          1
        </div>
        <div className={`h-0.5 w-8 ${step >= 2 ? 'bg-primary' : 'bg-muted-soft'}`} />
        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
          step >= 2 ? 'bg-primary text-white' : 'bg-muted-soft text-muted'
        }`}>
          2
        </div>
        <div className={`h-0.5 w-8 ${step >= 3 ? 'bg-primary' : 'bg-muted-soft'}`} />
        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
          step >= 3 ? 'bg-primary text-white' : 'bg-muted-soft text-muted'
        }`}>
          3
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-accent-soft px-4 py-3 text-sm text-accent-text">
          {error}
        </div>
      )}

      <div className="rounded-2xl bg-surface p-6 ring-1 ring-border">
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-foreground">채널 정보</h2>

            <div>
              <label htmlFor="channel_url" className="mb-1.5 block text-sm font-medium text-foreground">
                YouTube 채널 URL <span className="text-accent">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  id="channel_url"
                  type="url"
                  value={form.channel_url}
                  onChange={(e) => updateForm('channel_url', e.target.value)}
                  placeholder="https://youtube.com/@채널명"
                  className="flex-1 rounded-xl border border-border bg-background text-foreground px-4 py-3 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => fetchChannel(form.channel_url)}
                  disabled={channelLoading || !form.channel_url.trim()}
                  className="shrink-0 rounded-xl bg-secondary px-4 py-3 text-sm font-medium text-white hover:bg-secondary-hover disabled:opacity-50"
                >
                  {channelLoading ? '조회 중...' : '조회'}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-muted">
                채널 URL을 입력하고 조회 버튼을 누르면 구독자 수와 카테고리를 자동으로 가져옵니다
              </p>
            </div>

            {channelError && (
              <div className="rounded-lg bg-accent-soft px-4 py-3 text-sm text-accent-text">
                {channelError}
              </div>
            )}

            {/* 채널 정보 미리보기 */}
            {channelInfo && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center gap-3">
                  {channelInfo.thumbnail_url && (
                    <img
                      src={channelInfo.thumbnail_url}
                      alt={channelInfo.channel_name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {channelInfo.channel_name}
                    </p>
                    <p className="text-sm text-muted">
                      구독자 {channelInfo.subscriber_count.toLocaleString()}명
                    </p>
                  </div>
                  <div className="shrink-0 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                    연동 완료
                  </div>
                </div>
                {channelInfo.categories.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {channelInfo.categories.map((cat) => (
                      <span
                        key={cat}
                        className="rounded-full bg-muted-soft px-2.5 py-0.5 text-xs text-muted"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <label htmlFor="channel_name" className="mb-1.5 block text-sm font-medium text-foreground">
                채널 이름 {channelInfo && <span className="text-xs text-muted">(자동 입력됨)</span>}
              </label>
              <input
                id="channel_name"
                type="text"
                value={form.channel_name}
                onChange={(e) => updateForm('channel_name', e.target.value)}
                placeholder="예: 먹방의 정석"
                className="w-full rounded-xl border border-border bg-background text-foreground px-4 py-3 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <button
              onClick={handleNext}
              className="w-full rounded-xl bg-primary py-3 text-sm font-medium text-white hover:bg-primary-hover"
            >
              다음
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-foreground">정산 계좌</h2>
              <p className="mt-1 text-xs text-muted">나중에 설정할 수도 있습니다</p>
            </div>


            <div>
              <label htmlFor="bank_code" className="mb-1.5 block text-sm font-medium text-foreground">
                은행
              </label>
              <select
                id="bank_code"
                value={form.bank_code}
                onChange={(e) => updateForm('bank_code', e.target.value)}
                className="w-full rounded-xl border border-border bg-background text-foreground px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">선택하세요</option>
                {BANKS.map((bank) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="account_number" className="mb-1.5 block text-sm font-medium text-foreground">
                계좌번호
              </label>
              <input
                id="account_number"
                type="text"
                value={form.account_number}
                onChange={(e) => updateForm('account_number', e.target.value.replace(/[^0-9-]/g, ''))}
                placeholder="'-' 없이 숫자만 입력"
                className="w-full rounded-xl border border-border bg-background text-foreground px-4 py-3 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="account_holder" className="mb-1.5 block text-sm font-medium text-foreground">
                예금주
              </label>
              <input
                id="account_holder"
                type="text"
                value={form.account_holder}
                onChange={(e) => updateForm('account_holder', e.target.value)}
                placeholder="예금주명"
                className="w-full rounded-xl border border-border bg-background text-foreground px-4 py-3 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="rounded-xl border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-muted-soft"
              >
                이전
              </button>
              <button
                onClick={handleNext}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-medium text-white hover:bg-primary-hover"
              >
                다음
              </button>
            </div>

            <button
              onClick={handleNext}
              className="w-full text-center text-xs text-muted hover:text-foreground"
            >
              계좌는 나중에 입력할게요
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-foreground">본인인증 (KYC)</h2>
              <p className="mt-1 text-sm text-muted">
                정산을 위해 본인인증이 필요합니다. 나중에 설정에서도 할 수 있습니다.
              </p>
            </div>

            {/* 인증 유형 선택 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">인증 유형</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { updateForm('kyc_type', 'individual'); updateForm('kyc_value', ''); }}
                  className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                    form.kyc_type === 'individual'
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
                  onClick={() => { updateForm('kyc_type', 'business'); updateForm('kyc_value', ''); }}
                  className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                    form.kyc_type === 'business'
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

            {/* 입력 */}
            <div>
              <label htmlFor="kyc_value" className="mb-1.5 block text-sm font-medium text-foreground">
                {form.kyc_type === 'individual' ? '주민번호 뒷자리 (7자리)' : '사업자등록번호'}
              </label>
              <input
                id="kyc_value"
                type={form.kyc_type === 'individual' ? 'password' : 'text'}
                inputMode="numeric"
                value={form.kyc_value}
                onChange={(e) => handleKycValueChange(e.target.value)}
                placeholder={form.kyc_type === 'individual' ? '뒷 7자리 입력' : '000-00-00000'}
                className="w-full rounded-xl border border-border bg-background text-foreground px-4 py-3 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                autoComplete="off"
              />
              <p className="mt-1.5 text-xs text-muted">
                🔒 AES-256-GCM으로 암호화되어 안전하게 저장됩니다.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="rounded-xl border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-muted-soft"
              >
                이전
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || (form.kyc_value !== '' && !isKycValid)}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
              >
                {submitting ? '등록 중...' : '크리에이터 등록 완료'}
              </button>
            </div>

            <button
              onClick={() => { updateForm('kyc_value', ''); handleSubmit(); }}
              disabled={submitting}
              className="w-full text-center text-xs text-muted hover:text-foreground"
            >
              본인인증은 나중에 할게요
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
