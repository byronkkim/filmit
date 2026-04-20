/**
 * YouTube Data API v3 유틸리티
 * - 채널 URL에서 handle/channel ID 추출
 * - 채널 정보 조회 (이름, 구독자 수, 카테고리)
 */

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export interface YouTubeChannelInfo {
  channel_id: string;
  channel_name: string;
  subscriber_count: number;
  categories: string[];
  thumbnail_url: string;
  description: string;
}

/**
 * 다양한 YouTube 채널 URL 형식에서 handle 또는 channel ID를 추출
 *
 * 지원 형식:
 * - https://youtube.com/@handle
 * - https://www.youtube.com/@handle
 * - https://youtube.com/channel/UC...
 * - https://www.youtube.com/c/CustomName
 * - https://youtube.com/user/Username
 */
export function parseChannelUrl(url: string): { type: 'handle' | 'id' | 'custom' | 'user'; value: string } | null {
  try {
    const parsed = new URL(url.trim());
    if (!parsed.hostname.includes('youtube.com') && !parsed.hostname.includes('youtu.be')) {
      return null;
    }

    const path = parsed.pathname;

    // @handle 형식
    const handleMatch = path.match(/^\/@([^/]+)/);
    if (handleMatch) {
      return { type: 'handle', value: handleMatch[1] };
    }

    // /channel/UC... 형식
    const channelMatch = path.match(/^\/channel\/(UC[a-zA-Z0-9_-]+)/);
    if (channelMatch) {
      return { type: 'id', value: channelMatch[1] };
    }

    // /c/CustomName 형식
    const customMatch = path.match(/^\/c\/([^/]+)/);
    if (customMatch) {
      return { type: 'custom', value: customMatch[1] };
    }

    // /user/Username 형식
    const userMatch = path.match(/^\/user\/([^/]+)/);
    if (userMatch) {
      return { type: 'user', value: userMatch[1] };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * YouTube Data API v3로 채널 정보 조회
 */
export async function fetchChannelInfo(channelUrl: string): Promise<YouTubeChannelInfo> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY 환경변수가 설정되지 않았습니다.');
  }

  const parsed = parseChannelUrl(channelUrl);
  if (!parsed) {
    throw new Error('유효하지 않은 YouTube 채널 URL입니다.');
  }

  // 1단계: channel ID 확보
  let channelId: string;

  if (parsed.type === 'id') {
    channelId = parsed.value;
  } else if (parsed.type === 'handle') {
    channelId = await resolveHandle(parsed.value, apiKey);
  } else {
    // custom, user → search로 찾기
    channelId = await searchChannel(parsed.value, apiKey);
  }

  // 2단계: 채널 상세 정보 조회
  const params = new URLSearchParams({
    part: 'snippet,statistics,topicDetails',
    id: channelId,
    key: apiKey,
  });

  const res = await fetch(`${YOUTUBE_API_BASE}/channels?${params}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? 'YouTube API 요청 실패');
  }

  const data = await res.json();
  if (!data.items || data.items.length === 0) {
    throw new Error('채널을 찾을 수 없습니다.');
  }

  const channel = data.items[0];
  const snippet = channel.snippet;
  const statistics = channel.statistics;
  const topicDetails = channel.topicDetails;

  // 카테고리: topicDetails.topicCategories에서 Wikipedia URL → 카테고리명 추출
  const categories = (topicDetails?.topicCategories ?? [])
    .map((url: string) => {
      const match = url.match(/\/wiki\/(.+)$/);
      return match ? decodeURIComponent(match[1]).replace(/_/g, ' ') : null;
    })
    .filter(Boolean) as string[];

  return {
    channel_id: channelId,
    channel_name: snippet.title,
    subscriber_count: parseInt(statistics.subscriberCount, 10) || 0,
    categories,
    thumbnail_url: snippet.thumbnails?.medium?.url ?? snippet.thumbnails?.default?.url ?? '',
    description: snippet.description?.slice(0, 200) ?? '',
  };
}

export interface YouTubeVideoInfo {
  video_id: string;
  title: string;
  description: string;
  channel_id: string;
  channel_title: string;
  published_at: string;      // ISO 8601
  duration_seconds: number;
  thumbnail_url: string;
  has_captions: boolean;
}

/**
 * YouTube URL에서 video ID 추출
 * 지원: https://youtube.com/watch?v=VIDEO_ID, https://youtu.be/VIDEO_ID, https://youtube.com/shorts/VIDEO_ID
 */
export function parseVideoUrl(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    if (!parsed.hostname.includes('youtube.com') && !parsed.hostname.includes('youtu.be')) {
      return null;
    }

    // youtu.be/VIDEO_ID
    if (parsed.hostname.includes('youtu.be')) {
      const id = parsed.pathname.slice(1);
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    // youtube.com/watch?v=VIDEO_ID
    const v = parsed.searchParams.get('v');
    if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) {
      return v;
    }

    // youtube.com/shorts/VIDEO_ID or /embed/VIDEO_ID
    const pathMatch = parsed.pathname.match(/^\/(?:shorts|embed|v)\/([a-zA-Z0-9_-]{11})/);
    if (pathMatch) {
      return pathMatch[1];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * ISO 8601 duration (PT1H2M3S) → 초
 */
function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const [, h, m, s] = match;
  return (parseInt(h ?? '0') * 3600) + (parseInt(m ?? '0') * 60) + parseInt(s ?? '0');
}

/**
 * YouTube 영상 정보 조회
 */
export async function fetchVideoInfo(videoUrl: string): Promise<YouTubeVideoInfo> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY 환경변수가 설정되지 않았습니다.');
  }

  const videoId = parseVideoUrl(videoUrl);
  if (!videoId) {
    throw new Error('유효하지 않은 YouTube 영상 URL입니다.');
  }

  const params = new URLSearchParams({
    part: 'snippet,contentDetails',
    id: videoId,
    key: apiKey,
  });

  const res = await fetch(`${YOUTUBE_API_BASE}/videos?${params}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? 'YouTube API 요청 실패');
  }

  const data = await res.json();
  if (!data.items || data.items.length === 0) {
    throw new Error('영상을 찾을 수 없습니다. 비공개이거나 삭제된 영상일 수 있습니다.');
  }

  const video = data.items[0];
  const snippet = video.snippet;
  const contentDetails = video.contentDetails;

  return {
    video_id: videoId,
    title: snippet.title,
    description: snippet.description ?? '',
    channel_id: snippet.channelId,
    channel_title: snippet.channelTitle,
    published_at: snippet.publishedAt,
    duration_seconds: parseDuration(contentDetails.duration),
    thumbnail_url: snippet.thumbnails?.medium?.url ?? snippet.thumbnails?.default?.url ?? '',
    has_captions: contentDetails.caption === 'true',
  };
}

/**
 * @handle → channel ID 변환
 * YouTube Data API v3의 channels?forHandle= 사용
 */
async function resolveHandle(handle: string, apiKey: string): Promise<string> {
  const params = new URLSearchParams({
    part: 'id',
    forHandle: handle,
    key: apiKey,
  });

  const res = await fetch(`${YOUTUBE_API_BASE}/channels?${params}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? 'YouTube API 요청 실패');
  }

  const data = await res.json();
  if (!data.items || data.items.length === 0) {
    throw new Error(`@${handle} 채널을 찾을 수 없습니다.`);
  }

  return data.items[0].id;
}

/**
 * 커스텀 URL이나 username으로 채널 검색
 */
async function searchChannel(query: string, apiKey: string): Promise<string> {
  const params = new URLSearchParams({
    part: 'id',
    q: query,
    type: 'channel',
    maxResults: '1',
    key: apiKey,
  });

  const res = await fetch(`${YOUTUBE_API_BASE}/search?${params}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? 'YouTube API 검색 실패');
  }

  const data = await res.json();
  if (!data.items || data.items.length === 0) {
    throw new Error('채널을 찾을 수 없습니다.');
  }

  return data.items[0].id.channelId;
}
