// 토스페이먼츠 서버사이드 유틸
const SECRET_KEY = process.env.TOSS_SECRET_KEY!;
const CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm';
const CANCEL_URL = (paymentKey: string) => `https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`;

export function getAuthHeader() {
  const encoded = Buffer.from(SECRET_KEY + ':').toString('base64');
  return `Basic ${encoded}`;
}

export async function confirmPayment(paymentKey: string, orderId: string, amount: number) {
  const res = await fetch(CONFIRM_URL, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? '결제 승인에 실패했습니다.');
  }

  return data;
}

/**
 * 결제 취소 (환불)
 * @param paymentKey 토스 paymentKey
 * @param cancelReason 취소 사유
 * @param cancelAmount 취소 금액 (undefined면 전액)
 */
export async function cancelPayment(
  paymentKey: string,
  cancelReason: string,
  cancelAmount?: number,
) {
  const body: { cancelReason: string; cancelAmount?: number } = { cancelReason };
  if (cancelAmount !== undefined) {
    body.cancelAmount = cancelAmount;
  }

  const res = await fetch(CANCEL_URL(paymentKey), {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? '결제 취소에 실패했습니다.');
  }

  return data;
}
