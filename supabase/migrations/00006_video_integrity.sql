-- ============================================================
-- 00006_video_integrity.sql
-- 영상 무결성 어뷰징 방지
-- 1. 데드라인 자동 취소
-- 2. 업로드 날짜 검증
-- 4. 영상 중복 제출 방지
-- ============================================================

-- 1. videos.youtube_video_id UNIQUE 제약
-- 같은 YouTube 영상을 여러 퀘스트에 제출 방지
ALTER TABLE videos
  ADD CONSTRAINT videos_youtube_video_id_unique UNIQUE (youtube_video_id);

-- 2. videos에 YouTube 업로드 시각 저장
ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS youtube_published_at TIMESTAMPTZ;

-- 3. quests.deadline_at 기본값 (수락 시 14일 후로 설정)
-- 컬럼은 이미 있음, 로직은 앱 레이어에서 처리

-- 4. 데드라인 초과 퀘스트 자동 취소 함수
CREATE OR REPLACE FUNCTION expire_overdue_quests()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE quests
  SET
    status = 'open',           -- 다시 모집중으로 돌리기
    creator_id = NULL,         -- 크리에이터 할당 해제
    accepted_at = NULL,
    deadline_at = NULL
  WHERE
    status = 'in_progress'
    AND deadline_at IS NOT NULL
    AND deadline_at < now();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 크리에이터 제재 추적용 컬럼
ALTER TABLE creators
  ADD COLUMN IF NOT EXISTS abandoned_quests INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;

COMMENT ON COLUMN videos.youtube_published_at IS 'YouTube 원본 업로드 시각 (accepted_at 이후여야 유효)';
COMMENT ON COLUMN creators.abandoned_quests IS '데드라인 초과로 자동 취소된 퀘스트 누적 수';
COMMENT ON COLUMN creators.suspended_until IS '이 시각까지 새 퀘스트 수락 불가';
COMMENT ON FUNCTION expire_overdue_quests IS '데드라인 초과 퀘스트를 다시 모집중 상태로 돌리는 함수 (Cron 또는 수동 호출)';
