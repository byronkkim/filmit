/**
 * 투표 기간 계산 유틸
 * 총 후원액 기준 차등 적용
 */

export const VOTE_PERIOD_THRESHOLDS = {
  SMALL: 100_000,       // 10만원 미만: 24시간
  MEDIUM: 1_000_000,    // 10만~100만원: 3일
  // 100만원 이상: 7일
} as const;

export const VOTE_PERIODS_MS = {
  SHORT: 24 * 60 * 60 * 1000,           // 24시간
  MEDIUM: 3 * 24 * 60 * 60 * 1000,      // 3일
  LONG: 7 * 24 * 60 * 60 * 1000,        // 7일
} as const;

/**
 * 총 후원액에 따른 투표 기간(ms)
 */
export function getVotingPeriodMs(totalPledgedAmount: number): number {
  if (totalPledgedAmount < VOTE_PERIOD_THRESHOLDS.SMALL) {
    return VOTE_PERIODS_MS.SHORT;
  }
  if (totalPledgedAmount < VOTE_PERIOD_THRESHOLDS.MEDIUM) {
    return VOTE_PERIODS_MS.MEDIUM;
  }
  return VOTE_PERIODS_MS.LONG;
}

/**
 * 사람이 읽을 수 있는 투표 기간 레이블
 */
export function getVotingPeriodLabel(totalPledgedAmount: number): string {
  const ms = getVotingPeriodMs(totalPledgedAmount);
  if (ms === VOTE_PERIODS_MS.SHORT) return '24시간';
  if (ms === VOTE_PERIODS_MS.MEDIUM) return '3일';
  return '7일';
}

/**
 * 판정 매트릭스
 * - AI OK + 후원자 ≥ 50% OK → 정산
 * - AI No + 후원자 ≥ 67% OK → 정산
 * - 그 외 → 환불
 *
 * 분모 = 전체 후원자 수 (응답 여부 무관)
 * 무응답 = 승인으로 간주
 */
export function judgeVerification(params: {
  aiApproved: boolean;
  totalBackers: number;
  explicitNoVotes: number;  // 명시적으로 "아니에요" 투표한 수
}): { approved: boolean; reason: string } {
  const { aiApproved, totalBackers, explicitNoVotes } = params;

  // 무응답은 승인으로 간주 → okVotes = totalBackers - explicitNoVotes
  const okVotes = Math.max(0, totalBackers - explicitNoVotes);
  const okRatio = totalBackers > 0 ? okVotes / totalBackers : 1;

  if (aiApproved) {
    // AI OK: 50% 이상 OK면 승인
    if (okRatio >= 0.5) {
      return { approved: true, reason: 'AI 승인 + 후원자 과반 승인' };
    }
    return { approved: false, reason: 'AI 승인 but 후원자 과반 미달' };
  } else {
    // AI No: 2/3 이상 OK여야 승인
    if (okRatio >= 2 / 3) {
      return { approved: true, reason: 'AI 거부 but 후원자 2/3 승인' };
    }
    return { approved: false, reason: 'AI 거부 + 후원자 2/3 미달' };
  }
}
