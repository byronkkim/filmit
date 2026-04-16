// 토스페이먼츠 서버사이드 유틸
const SECRET_KEY = process.env.TOSS_SECRET_KEY!;
const CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm';

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
