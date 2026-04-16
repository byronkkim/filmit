-- 퀘스트 총 후원액 증가 함수
CREATE OR REPLACE FUNCTION increment_quest_pledged_amount(
  quest_id_input UUID,
  amount_input INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE quests
  SET
    total_pledged_amount = total_pledged_amount + amount_input,
    creator_reward_amount = creator_reward_amount + amount_input
  WHERE id = quest_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
