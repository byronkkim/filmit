// ============================================================
// filmit 비즈니스 상수
// 모든 금액은 정수(원 단위), 비율은 소수점
// ============================================================

/** 시청자 플랫폼 수수료율 (10%) */
export const VIEWER_PLATFORM_FEE_RATE = 0.10;

/** 광고주 플랫폼 수수료율 (15%) */
export const ADVERTISER_PLATFORM_FEE_RATE = 0.15;

/** 광고주 영상 소유권 이전 추가 수수료율 (+5%) */
export const OWNERSHIP_TRANSFER_FEE_RATE = 0.05;

/** PG 수수료율 (~3.3%) */
export const PG_FEE_RATE = 0.033;

/** 원천징수율 (3.3%) */
export const WITHHOLDING_TAX_RATE = 0.033;

/** 영상 공개 후 이의신청 기간 (일) */
export const OBJECTION_PERIOD_DAYS = 7;

/** 크리에이터 제작 기한 (일) */
export const QUEST_DEADLINE_DAYS = 30;

/** 퀘스트 유사도 임계값 (코사인 유사도) */
export const QUEST_SIMILARITY_THRESHOLD = 0.80;

/** AI 검증 통과 점수 */
export const AI_VERIFICATION_PASS_SCORE = 90;

/** AI 검증 수동 검토 하한 점수 */
export const AI_VERIFICATION_REVIEW_SCORE = 50;

// ---------- 수수료 계산 유틸 ----------

/** 플랫폼 수수료 계산 (정수 반환) */
export function calcPlatformFee(rewardAmount: number, isAdvertiser: boolean): number {
  const rate = isAdvertiser ? ADVERTISER_PLATFORM_FEE_RATE : VIEWER_PLATFORM_FEE_RATE;
  return Math.round(rewardAmount * rate);
}

/** PG 수수료 계산 (정수 반환) */
export function calcPgFee(totalBeforePg: number): number {
  return Math.round(totalBeforePg * PG_FEE_RATE);
}

/** 시청자/광고주 실결제액 계산 */
export function calcTotalPayment(rewardAmount: number, isAdvertiser: boolean): {
  platformFee: number;
  pgFee: number;
  totalPaid: number;
} {
  const platformFee = calcPlatformFee(rewardAmount, isAdvertiser);
  const beforePg = rewardAmount + platformFee;
  const pgFee = calcPgFee(beforePg);
  return {
    platformFee,
    pgFee,
    totalPaid: beforePg + pgFee,
  };
}

/** 원천징수액 계산 (정수 반환) */
export function calcWithholdingTax(grossAmount: number): number {
  return Math.round(grossAmount * WITHHOLDING_TAX_RATE);
}

/** 크리에이터 실수령액 계산 */
export function calcNetSettlement(grossAmount: number): {
  withholdingTax: number;
  netAmount: number;
} {
  const withholdingTax = calcWithholdingTax(grossAmount);
  return {
    withholdingTax,
    netAmount: grossAmount - withholdingTax,
  };
}
