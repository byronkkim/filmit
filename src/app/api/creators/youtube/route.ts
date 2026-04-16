import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchChannelInfo } from '@/lib/youtube';

/**
 * GET /api/creators/youtube?url=...
 * YouTube 채널 URL로 채널 정보 조회
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: '채널 URL을 입력해주세요.' }, { status: 400 });
  }

  try {
    const channelInfo = await fetchChannelInfo(url);
    return NextResponse.json({ channel: channelInfo });
  } catch (error) {
    const message = error instanceof Error ? error.message : '채널 정보를 가져올 수 없습니다.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
