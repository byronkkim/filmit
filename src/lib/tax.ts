/**
 * 세금 계산 유틸
 * 모든 금액은 정수(원 단위). 부동소수점 금지.
 */

/**
 * 원천징수율 3.3% (소득세 3% + 지방소득세 0.3%)
 */
export const WITHHOLDING_TAX_RATE = 33; // 1000분율로 관리 (33/1000 = 3.3%)

/**
 * 원천징수액 계산 (소득세 3% + 지방소득세 0.3%)
 * - 정수 계산: gross × 33 / 1000 (원 단위 반올림)
 * @param grossAmount 세전 지급액 (원)
 * @returns 원천징수액 (원)
 */
export function calculateWithholdingTax(grossAmount: number): number {
  return Math.round((grossAmount * WITHHOLDING_TAX_RATE) / 1000);
}

/**
 * 실수령액 = gross - withholding_tax
 */
export function calculateNetAmount(grossAmount: number): number {
  return grossAmount - calculateWithholdingTax(grossAmount);
}
