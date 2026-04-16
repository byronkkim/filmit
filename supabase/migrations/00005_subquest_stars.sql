-- ============================================================
-- 00005_subquest_stars.sql
-- 서브퀘스트를 금액 기반 → 별(명예) 시스템으로 전환
-- 메인퀘스트 달성 → 전액 정산, 서브퀘스트는 ⭐ 리뷰
-- ============================================================

-- 1. sub_quests.amount 컬럼 제거 (더 이상 서브퀘스트에 금액 없음)
ALTER TABLE sub_quests DROP COLUMN IF EXISTS amount;

-- 2. sub_quests에 투표 관련 컬럼 추가
ALTER TABLE sub_quests
  ADD COLUMN IF NOT EXISTS star_votes_yes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS star_votes_no INTEGER NOT NULL DEFAULT 0;

-- 3. pledges에서 sub_quest_id FK 제거 (후원은 퀘스트 단위로만)
ALTER TABLE pledges DROP CONSTRAINT IF EXISTS pledges_sub_quest_id_fkey;
ALTER TABLE pledges DROP COLUMN IF EXISTS sub_quest_id;

-- 4. 서브퀘스트 투표 테이블 (후원자 리뷰)
CREATE TABLE IF NOT EXISTS sub_quest_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_quest_id UUID NOT NULL REFERENCES sub_quests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  vote BOOLEAN NOT NULL,  -- true = 달성, false = 미달성
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sub_quest_id, user_id)  -- 후원자당 1회 투표
);

CREATE INDEX IF NOT EXISTS idx_sub_quest_votes_sub_quest_id ON sub_quest_votes(sub_quest_id);

-- RLS 활성화
ALTER TABLE sub_quest_votes ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 인증된 사용자 읽기 + 본인 투표만 생성
CREATE POLICY "sub_quest_votes_select" ON sub_quest_votes
  FOR SELECT USING (true);

CREATE POLICY "sub_quest_votes_insert" ON sub_quest_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE sub_quest_votes IS '서브퀘스트 달성 여부 후원자 투표 (리뷰)';
COMMENT ON COLUMN sub_quests.star_votes_yes IS '달성 투표 수';
COMMENT ON COLUMN sub_quests.star_votes_no IS '미달성 투표 수';
