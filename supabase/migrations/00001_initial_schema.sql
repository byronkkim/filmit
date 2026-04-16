-- ============================================================
-- filmit 초기 DB 스키마
-- ============================================================

-- 0. 확장 활성화
create extension if not exists "vector" with schema extensions;
create extension if not exists "pg_trgm";

-- ============================================================
-- 1. ENUM 타입
-- ============================================================

create type user_type as enum ('viewer', 'advertiser', 'creator');

create type quest_status as enum (
  'draft',        -- AI가 생성 중
  'open',         -- 크리에이터 모집 중
  'in_progress',  -- 크리에이터 수락, 제작 중
  'reviewing',    -- 영상 제출됨, 검증 중
  'completed',    -- 정산 완료
  'cancelled'     -- 취소됨
);

create type sub_quest_status as enum (
  'pending',      -- 미달성
  'achieved',     -- 달성
  'failed'        -- 미달성 확정
);

create type pledge_status as enum (
  'pending',      -- 결제 대기
  'escrowed',     -- 에스크로 보관 중
  'released',     -- 크리에이터에게 지급됨
  'refunded',     -- 환불됨
  'partial_refund'-- 부분 환불
);

create type video_status as enum (
  'uploaded',     -- 업로드됨
  'verifying',    -- AI 검증 중
  'approved',     -- 검증 통과
  'manual_review',-- 수동 검토 필요 (50~90%)
  'rejected',     -- 거부됨
  'published'     -- 공개됨 (이의신청 기간 시작)
);

create type settlement_status as enum (
  'pending',      -- 정산 대기
  'processing',   -- 정산 처리 중
  'completed',    -- 정산 완료
  'failed'        -- 정산 실패
);

create type creator_grade as enum (
  'bronze',
  'silver',
  'gold',
  'platinum'
);

create type dispute_status as enum (
  'open',
  'auto_resolved',
  'admin_review',
  'closed'
);

-- ============================================================
-- 2. users 테이블
-- ============================================================

create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  user_type user_type not null,
  display_name text not null,
  avatar_url text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 3. creators 테이블
-- ============================================================

create table creators (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  channel_url text not null,
  channel_id text unique,
  channel_name text,
  subscriber_count integer not null default 0,
  categories text[] not null default '{}',
  grade creator_grade not null default 'bronze',
  completed_quests integer not null default 0,
  achievement_rate numeric(5,2) not null default 0,   -- 달성률 (%)
  dispute_rate numeric(5,2) not null default 0,        -- 이의신청 비율 (%)
  -- KYC
  resident_id_encrypted bytea,  -- AES-256 암호화된 주민번호 뒷자리
  business_number text,         -- 사업자번호
  -- 정산 계좌
  bank_code text,
  account_number text,
  account_holder text,
  account_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(user_id)
);

-- ============================================================
-- 4. quests 테이블
-- ============================================================

create table quests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  embedding extensions.vector(1536),          -- pgvector: 유사 퀘스트 탐색용
  status quest_status not null default 'draft',
  creator_reward_amount integer not null default 0,  -- 크리에이터 보상금 (원, 정수)
  total_pledged_amount integer not null default 0,    -- 총 후원 모금액 (원)
  creator_id uuid references creators(id),            -- 수락한 크리에이터
  -- 광고주 전용 필터
  is_private boolean not null default false,
  min_subscribers integer,
  allowed_categories text[],
  allowed_channel_ids text[],
  is_competitive boolean not null default false,       -- 경쟁 방식 여부
  -- 기한
  deadline_at timestamptz,
  accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- pgvector 인덱스: 코사인 유사도 검색
create index idx_quests_embedding on quests
  using ivfflat (embedding extensions.vector_cosine_ops)
  with (lists = 100);

-- ============================================================
-- 5. sub_quests 테이블
-- ============================================================

create table sub_quests (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references quests(id) on delete cascade,
  description text not null,
  is_main boolean not null default false,     -- true = 필수 조건
  amount integer not null default 0,          -- 서브퀘스트별 금액 (광고주용, 원)
  status sub_quest_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_sub_quests_quest_id on sub_quests(quest_id);

-- ============================================================
-- 6. pledges 테이블 (후원/결제)
-- ============================================================

create table pledges (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references quests(id) on delete cascade,
  sub_quest_id uuid references sub_quests(id),
  user_id uuid not null references users(id),
  amount integer not null,                            -- 크리에이터 보상에 기여하는 금액 (원)
  platform_fee integer not null,                      -- 플랫폼 수수료 (원)
  pg_fee integer not null default 0,                  -- PG 수수료 (원)
  total_paid integer not null,                        -- 실결제액 = amount + platform_fee + pg_fee
  status pledge_status not null default 'pending',
  -- 토스페이먼츠
  payment_key text,
  order_id text unique,
  -- 환불
  refunded_at timestamptz,
  refund_amount integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_pledges_quest_id on pledges(quest_id);
create index idx_pledges_user_id on pledges(user_id);

-- ============================================================
-- 7. videos 테이블
-- ============================================================

create table videos (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references quests(id) on delete cascade,
  creator_id uuid not null references creators(id),
  video_url text not null,
  youtube_video_id text,
  duration_seconds integer,
  -- AI 검증 결과
  ai_verification_score numeric(5,2),     -- 0~100
  ai_verification_result jsonb,            -- 상세 검증 결과 JSON
  status video_status not null default 'uploaded',
  -- 이의신청 기간
  objection_deadline_at timestamptz,       -- 공개 후 7일
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_videos_quest_id on videos(quest_id);
create index idx_videos_creator_id on videos(creator_id);

-- ============================================================
-- 8. settlements 테이블 (정산)
-- ============================================================

create table settlements (
  id uuid primary key default gen_random_uuid(),
  pledge_id uuid not null references pledges(id),
  creator_id uuid not null references creators(id),
  gross_amount integer not null,               -- 세전 지급액 (원)
  withholding_tax integer not null,            -- 원천징수 3.3% (원)
  net_amount integer not null,                 -- 실수령액 = gross - tax (원)
  status settlement_status not null default 'pending',
  receipt_url text,                             -- 원천징수영수증 PDF URL
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_settlements_creator_id on settlements(creator_id);
create index idx_settlements_pledge_id on settlements(pledge_id);

-- ============================================================
-- 9. disputes 테이블 (이의신청)
-- ============================================================

create table disputes (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references videos(id),
  reporter_id uuid not null references users(id),
  reason text not null,
  ai_judgement jsonb,                          -- Claude API 자동 판정 결과
  status dispute_status not null default 'open',
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 10. updated_at 자동 갱신 트리거
-- ============================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_users_updated_at before update on users
  for each row execute function update_updated_at();

create trigger trg_creators_updated_at before update on creators
  for each row execute function update_updated_at();

create trigger trg_quests_updated_at before update on quests
  for each row execute function update_updated_at();

create trigger trg_sub_quests_updated_at before update on sub_quests
  for each row execute function update_updated_at();

create trigger trg_pledges_updated_at before update on pledges
  for each row execute function update_updated_at();

create trigger trg_videos_updated_at before update on videos
  for each row execute function update_updated_at();

create trigger trg_settlements_updated_at before update on settlements
  for each row execute function update_updated_at();

create trigger trg_disputes_updated_at before update on disputes
  for each row execute function update_updated_at();

-- ============================================================
-- 11. RLS 활성화 (정책은 Auth 연동 후 별도 마이그레이션에서 추가)
-- ============================================================

alter table users enable row level security;
alter table creators enable row level security;
alter table quests enable row level security;
alter table sub_quests enable row level security;
alter table pledges enable row level security;
alter table videos enable row level security;
alter table settlements enable row level security;
alter table disputes enable row level security;
