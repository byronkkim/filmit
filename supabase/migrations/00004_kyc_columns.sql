-- ============================================================
-- 00004_kyc_columns.sql
-- 크리에이터 KYC(본인인증) 관련 컬럼 추가
-- ============================================================

-- kyc_type: 'individual' (개인/주민번호) 또는 'business' (사업자)
-- kyc_encrypted: AES-256-GCM 암호화된 주민번호 뒷자리 또는 사업자번호
-- kyc_iv: 암호화에 사용된 IV (hex)
-- kyc_verified: KYC 인증 완료 여부
-- kyc_verified_at: KYC 인증 완료 시각

ALTER TABLE creators
  ADD COLUMN IF NOT EXISTS kyc_type TEXT CHECK (kyc_type IN ('individual', 'business')),
  ADD COLUMN IF NOT EXISTS kyc_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS kyc_iv TEXT,
  ADD COLUMN IF NOT EXISTS kyc_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMPTZ;

-- kyc_encrypted, kyc_iv 컬럼은 RLS로 보호 (기존 RLS에 의해 본인만 접근 가능)
-- 추가적으로 service_role만 복호화할 수 있도록 컬럼 레벨 보안은 앱 레이어에서 처리

COMMENT ON COLUMN creators.kyc_type IS '개인(individual) 또는 사업자(business)';
COMMENT ON COLUMN creators.kyc_encrypted IS 'AES-256-GCM 암호화된 주민번호 뒷자리 또는 사업자번호';
COMMENT ON COLUMN creators.kyc_iv IS '암호화 IV (hex)';
COMMENT ON COLUMN creators.kyc_verified IS 'KYC 인증 완료 여부';
COMMENT ON COLUMN creators.kyc_verified_at IS 'KYC 인증 완료 시각';
