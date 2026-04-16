import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/crypto';

// POST /api/creators/kyc — KYC 정보 제출
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  // 크리에이터 프로필 확인
  const { data: creator } = await supabase
    .from('creators')
    .select('id, kyc_verified')
    .eq('user_id', user.id)
    .single();

  if (!creator) {
    return NextResponse.json({ error: '크리에이터 등록을 먼저 해주세요.' }, { status: 404 });
  }

  if (creator.kyc_verified) {
    return NextResponse.json({ error: '이미 본인인증이 완료되었습니다.' }, { status: 409 });
  }

  const body = await request.json();
  const { kyc_type, kyc_value } = body as {
    kyc_type: 'individual' | 'business';
    kyc_value: string;
  };

  // 유효성 검사
  if (!kyc_type || !kyc_value) {
    return NextResponse.json({ error: '인증 유형과 값을 입력해주세요.' }, { status: 400 });
  }

  if (kyc_type === 'individual') {
    // 주민번호 뒷자리: 7자리 숫자
    const cleaned = kyc_value.replace(/\s/g, '');
    if (!/^\d{7}$/.test(cleaned)) {
      return NextResponse.json(
        { error: '주민번호 뒷자리는 7자리 숫자여야 합니다.' },
        { status: 400 }
      );
    }
  } else if (kyc_type === 'business') {
    // 사업자등록번호: 10자리 숫자 (하이픈 제거)
    const cleaned = kyc_value.replace(/[-\s]/g, '');
    if (!/^\d{10}$/.test(cleaned)) {
      return NextResponse.json(
        { error: '사업자등록번호는 10자리 숫자여야 합니다.' },
        { status: 400 }
      );
    }
  } else {
    return NextResponse.json({ error: '올바른 인증 유형을 선택해주세요.' }, { status: 400 });
  }

  // AES-256-GCM 암호화
  const cleanedValue = kyc_type === 'individual'
    ? kyc_value.replace(/\s/g, '')
    : kyc_value.replace(/[-\s]/g, '');

  let encryptedData;
  try {
    encryptedData = encrypt(cleanedValue);
  } catch (err) {
    console.error('KYC 암호화 실패:', err);
    return NextResponse.json(
      { error: '서버 설정 오류가 발생했습니다. 관리자에게 문의하세요.' },
      { status: 500 }
    );
  }

  // DB 업데이트
  const { error } = await supabase
    .from('creators')
    .update({
      kyc_type,
      kyc_encrypted: encryptedData.encrypted,
      kyc_iv: encryptedData.iv,
      kyc_verified: true,
      kyc_verified_at: new Date().toISOString(),
    })
    .eq('id', creator.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: '본인인증이 완료되었습니다.',
    kyc_type,
    kyc_verified: true,
  });
}

// GET /api/creators/kyc — KYC 상태 조회 (암호화된 값은 절대 반환 안 함)
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { data: creator } = await supabase
    .from('creators')
    .select('kyc_type, kyc_verified, kyc_verified_at')
    .eq('user_id', user.id)
    .single();

  if (!creator) {
    return NextResponse.json({ error: '크리에이터 등록을 먼저 해주세요.' }, { status: 404 });
  }

  return NextResponse.json({
    kyc_type: creator.kyc_type,
    kyc_verified: creator.kyc_verified,
    kyc_verified_at: creator.kyc_verified_at,
  });
}
