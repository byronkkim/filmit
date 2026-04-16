import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/creators — 내 크리에이터 프로필 조회
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { data: creator, error } = await supabase
    .from('creators')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ creator: creator ?? null });
}

// POST /api/creators — 크리에이터 프로필 생성
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const body = await request.json();
  const {
    channel_url, channel_name, channel_id,
    subscriber_count, categories,
    bank_code, account_number, account_holder,
  } = body as {
    channel_url: string;
    channel_name?: string;
    channel_id?: string;
    subscriber_count?: number;
    categories?: string[];
    bank_code?: string;
    account_number?: string;
    account_holder?: string;
  };

  if (!channel_url) {
    return NextResponse.json({ error: '채널 URL은 필수입니다.' }, { status: 400 });
  }

  // 이미 크리에이터 프로필이 있는지 확인
  const { data: existing } = await supabase
    .from('creators')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (existing) {
    return NextResponse.json({ error: '이미 크리에이터로 등록되어 있습니다.' }, { status: 409 });
  }

  const { data: creator, error } = await supabase
    .from('creators')
    .insert({
      user_id: user.id,
      channel_url,
      channel_name: channel_name || null,
      channel_id: channel_id || null,
      subscriber_count: subscriber_count ?? 0,
      categories: categories ?? [],
      bank_code: bank_code || null,
      account_number: account_number || null,
      account_holder: account_holder || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ creator }, { status: 201 });
}

// PATCH /api/creators — 크리에이터 프로필 수정
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const body = await request.json();

  const { data: creator, error } = await supabase
    .from('creators')
    .update(body)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ creator });
}
