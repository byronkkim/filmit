/**
 * 이메일 발송 유틸 (Resend)
 *
 * 무료 테스트: from = 'onboarding@resend.dev'
 * 도메인 연결 후: from = 'noreply@filmit.app' 등으로 변경
 */

import { Resend } from 'resend';

const FROM_ADDRESS = 'filmit <onboarding@resend.dev>';
const APP_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : process.env.NEXT_PUBLIC_APP_URL ?? 'https://filmit.vercel.app';

function getClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY 환경변수가 설정되지 않았습니다.');
  }
  return new Resend(apiKey);
}

interface BaseEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * 기본 이메일 템플릿 래퍼 (filmit 브랜드 스타일)
 */
function wrapTemplate(content: string, ctaText?: string, ctaUrl?: string): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>filmit</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 560px; background: #ffffff; border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 32px 32px 8px;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #1e293b;">🎬 filmit</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px 24px; color: #334155; font-size: 15px; line-height: 1.6;">
              ${content}
              ${ctaText && ctaUrl ? `
              <div style="margin: 24px 0 8px;">
                <a href="${ctaUrl}" style="display: inline-block; background: #6366f1; color: white; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-size: 14px; font-weight: 600;">
                  ${ctaText}
                </a>
              </div>
              ` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px;">
              filmit — 시청자가 원하는 영상, 직접 요청하세요<br>
              <a href="${APP_URL}" style="color: #94a3b8; text-decoration: underline;">${APP_URL}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

async function send({ to, subject, html }: BaseEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY 미설정 — 발송 스킵:', subject, '→', to);
    return { skipped: true };
  }

  try {
    const client = getClient();
    const result = await client.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
    });
    return { result };
  } catch (err) {
    console.error('[email] 발송 실패:', err);
    return { error: err };
  }
}

// ============================================================
// 알림 템플릿
// ============================================================

export async function sendPledgeCompleteEmail(params: {
  to: string;
  questTitle: string;
  questId: string;
  amount: number;
}) {
  const { to, questTitle, questId, amount } = params;
  const url = `${APP_URL}/quests/${questId}`;
  const html = wrapTemplate(
    `
      <p style="margin: 0 0 12px;"><strong>후원이 완료되었어요 🎉</strong></p>
      <p style="margin: 0 0 12px;">"${questTitle}" 퀘스트에 <strong>${amount.toLocaleString()}원</strong>을 후원하셨어요.</p>
      <p style="margin: 0;">크리에이터가 영상을 제작하면 알려드릴게요!</p>
    `,
    '퀘스트 보러가기',
    url,
  );
  return send({ to, subject: `[filmit] "${questTitle}" 후원 완료`, html });
}

export async function sendCreatorAcceptedEmail(params: {
  to: string;
  questTitle: string;
  questId: string;
  creatorName: string;
}) {
  const { to, questTitle, questId, creatorName } = params;
  const url = `${APP_URL}/quests/${questId}`;
  const html = wrapTemplate(
    `
      <p style="margin: 0 0 12px;"><strong>크리에이터가 도전을 시작했어요 🎬</strong></p>
      <p style="margin: 0 0 12px;">"${questTitle}" 퀘스트를 <strong>${creatorName}</strong>님이 수락하셨어요!</p>
      <p style="margin: 0;">영상이 완성되면 다시 알려드릴게요.</p>
    `,
    '퀘스트 보러가기',
    url,
  );
  return send({ to, subject: `[filmit] "${questTitle}" 크리에이터 수락`, html });
}

export async function sendVideoSubmittedEmail(params: {
  to: string;
  questTitle: string;
  questId: string;
  videoUrl: string;
}) {
  const { to, questTitle, questId, videoUrl } = params;
  const url = `${APP_URL}/quests/${questId}`;
  const html = wrapTemplate(
    `
      <p style="margin: 0 0 12px;"><strong>영상이 제출되었어요! 투표해주세요 🗳️</strong></p>
      <p style="margin: 0 0 12px;">"${questTitle}" 퀘스트의 영상이 도착했어요.</p>
      <p style="margin: 0 0 12px;"><a href="${videoUrl}" style="color: #6366f1;">영상 보러가기 →</a></p>
      <p style="margin: 0; color: #64748b; font-size: 13px;">투표 기간 안에 응답해주세요. 무응답은 승인으로 처리됩니다.</p>
    `,
    '판정 페이지로',
    url,
  );
  return send({ to, subject: `[filmit] "${questTitle}" 영상 제출 — 판정 투표`, html });
}

export async function sendQuestApprovedEmail(params: {
  to: string;
  questTitle: string;
  questId: string;
  netAmount: number;
  withholdingTax: number;
}) {
  const { to, questTitle, questId, netAmount, withholdingTax } = params;
  const url = `${APP_URL}/quests/${questId}`;
  const html = wrapTemplate(
    `
      <p style="margin: 0 0 12px;"><strong>축하합니다! 정산이 확정되었어요 🎉</strong></p>
      <p style="margin: 0 0 12px;">"${questTitle}" 퀘스트가 승인되었습니다.</p>
      <ul style="margin: 0 0 12px; padding-left: 20px; color: #475569;">
        <li>실수령액: <strong>${netAmount.toLocaleString()}원</strong></li>
        <li>원천징수: ${withholdingTax.toLocaleString()}원</li>
      </ul>
      <p style="margin: 0; color: #64748b; font-size: 13px;">정산 계좌로 영업일 기준 7일 이내 입금됩니다.</p>
    `,
    '정산 내역 보기',
    url,
  );
  return send({ to, subject: `[filmit] "${questTitle}" 정산 확정`, html });
}

export async function sendQuestRejectedToCreatorEmail(params: {
  to: string;
  questTitle: string;
  questId: string;
}) {
  const { to, questTitle, questId } = params;
  const url = `${APP_URL}/quests/${questId}`;
  const html = wrapTemplate(
    `
      <p style="margin: 0 0 12px;"><strong>판정 결과를 안내드려요</strong></p>
      <p style="margin: 0 0 12px;">"${questTitle}" 퀘스트가 <strong>거부 판정</strong>되었습니다.</p>
      <p style="margin: 0; color: #64748b; font-size: 13px;">자세한 사유는 판정 페이지에서 확인하세요.</p>
    `,
    '판정 페이지 보기',
    url,
  );
  return send({ to, subject: `[filmit] "${questTitle}" 판정 결과 안내`, html });
}

export async function sendQuestRefundedEmail(params: {
  to: string;
  questTitle: string;
  amount: number;
}) {
  const { to, questTitle, amount } = params;
  const html = wrapTemplate(
    `
      <p style="margin: 0 0 12px;"><strong>환불이 처리되었어요</strong></p>
      <p style="margin: 0 0 12px;">"${questTitle}" 퀘스트의 후원금 <strong>${amount.toLocaleString()}원</strong>이 환불되었습니다.</p>
      <p style="margin: 0; color: #64748b; font-size: 13px;">결제하신 카드사로 영업일 기준 3~5일 이내 환불됩니다.</p>
    `,
  );
  return send({ to, subject: `[filmit] "${questTitle}" 환불 안내`, html });
}

export async function sendQuestNominationEmail(params: {
  to: string;
  channelName: string;
  questTitle: string;
  questId: string;
}) {
  const { to, channelName, questTitle, questId } = params;
  const url = `${APP_URL}/quests/${questId}`;
  const html = wrapTemplate(
    `
      <p style="margin: 0 0 12px;"><strong>${channelName}님께 영상 제작 요청이 들어왔어요 🎬</strong></p>
      <p style="margin: 0 0 12px;">시청자가 ${channelName}님을 지명해서 다음 퀘스트를 등록했어요:</p>
      <p style="margin: 0 0 16px; padding: 12px 16px; background: #f1f5f9; border-radius: 8px; font-weight: 600;">"${questTitle}"</p>
      <p style="margin: 0; color: #64748b; font-size: 13px;">수락하시면 14일 안에 영상을 업로드해주시면 돼요. 거절하셔도 패널티는 없습니다.</p>
    `,
    '퀘스트 보러가기',
    url,
  );
  return send({ to, subject: `[filmit] ${channelName}님께 영상 요청이 도착했어요!`, html });
}

export async function sendDeadlineReminderEmail(params: {
  to: string;
  questTitle: string;
  questId: string;
  daysLeft: number;
}) {
  const { to, questTitle, questId, daysLeft } = params;
  const url = `${APP_URL}/quests/${questId}`;
  const html = wrapTemplate(
    `
      <p style="margin: 0 0 12px;"><strong>⏰ D-${daysLeft} 데드라인 임박!</strong></p>
      <p style="margin: 0 0 12px;">"${questTitle}" 퀘스트 마감이 ${daysLeft}일 남았어요.</p>
      <p style="margin: 0; color: #64748b; font-size: 13px;">데드라인 초과 시 퀘스트가 자동 취소되며, 누적 시 제재가 적용됩니다.</p>
    `,
    '영상 제출하러 가기',
    url,
  );
  return send({ to, subject: `[filmit] "${questTitle}" D-${daysLeft} 데드라인`, html });
}
