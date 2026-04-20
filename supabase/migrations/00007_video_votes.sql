-- ============================================================
-- 00007_video_votes.sql
-- 메인 영상 투표 (정산/환불 결정용)
-- 후원자 1명당 1표 (금액 무관)
-- ============================================================

CREATE TABLE IF NOT EXISTS video_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  vote BOOLEAN NOT NULL,  -- true = 주제에 맞음, false = 맞지 않음
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(video_id, user_id)  -- 1인 1표
);

CREATE INDEX IF NOT EXISTS idx_video_votes_video_id ON video_votes(video_id);
CREATE INDEX IF NOT EXISTS idx_video_votes_user_id ON video_votes(user_id);

-- videos 테이블에 집계 컬럼 추가 (투표 종료 시 업데이트)
ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS vote_yes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vote_no INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vote_deadline_at TIMESTAMPTZ;

-- RLS
ALTER TABLE video_votes ENABLE ROW LEVEL SECURITY;

-- 읽기: 누구나 투표 결과 집계는 볼 수 있음 (video_id 기준 count)
CREATE POLICY "video_votes_select" ON video_votes
  FOR SELECT USING (true);

-- 쓰기: 본인 투표만 (해당 퀘스트에 후원 기록이 있어야 함 - 앱 레이어에서 검증)
CREATE POLICY "video_votes_insert" ON video_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 본인 투표만 수정/삭제 가능 (투표 마음 변경 허용)
CREATE POLICY "video_votes_update" ON video_votes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "video_votes_delete" ON video_votes
  FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE video_votes IS '영상이 퀘스트 주제에 맞는지 후원자 투표 (1인 1표)';
COMMENT ON COLUMN videos.vote_yes IS '찬성 투표 수';
COMMENT ON COLUMN videos.vote_no IS '반대 투표 수';
COMMENT ON COLUMN videos.vote_deadline_at IS '투표 종료 시각 (총 후원액 기준 24h/3d/7d)';
