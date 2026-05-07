-- ============================================================
-- 00008_target_youtuber.sql
-- 퀘스트가 특정 YouTube 채널(유튜버)을 지명할 수 있도록 컬럼 추가
-- ============================================================

ALTER TABLE quests
  ADD COLUMN IF NOT EXISTS target_channel_id TEXT,
  ADD COLUMN IF NOT EXISTS target_channel_name TEXT,
  ADD COLUMN IF NOT EXISTS target_channel_thumbnail TEXT,
  ADD COLUMN IF NOT EXISTS target_channel_url TEXT;

CREATE INDEX IF NOT EXISTS idx_quests_target_channel_id ON quests(target_channel_id);

COMMENT ON COLUMN quests.target_channel_id IS '지명된 YouTube 채널 ID (UC...). 비우면 누구나 도전 가능';
COMMENT ON COLUMN quests.target_channel_name IS '지명 채널 이름 (캐시)';
COMMENT ON COLUMN quests.target_channel_thumbnail IS '지명 채널 썸네일 URL (캐시)';
COMMENT ON COLUMN quests.target_channel_url IS '지명 채널 원본 URL';
