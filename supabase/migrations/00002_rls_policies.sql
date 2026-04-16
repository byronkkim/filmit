-- ============================================================
-- filmit RLS 정책
-- 모든 정책은 auth.uid()를 users.id와 동일하게 사용한다고 가정
-- (select auth.uid()) 패턴으로 성능 최적화
-- ============================================================

-- ============================================================
-- 1. users 테이블 정책
-- ============================================================

-- 사용자는 자신의 행만 조회 가능
create policy "users_select_own"
  on users for select
  using (id = (select auth.uid()));

-- 회원가입 시 자신의 행 삽입 가능
create policy "users_insert_own"
  on users for insert
  with check (id = (select auth.uid()));

-- 사용자는 자신의 행만 수정 가능
create policy "users_update_own"
  on users for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ============================================================
-- 2. creators 테이블 정책
-- ============================================================

-- 크리에이터는 자신의 행만 조회 가능
create policy "creators_select_own"
  on creators for select
  using (user_id = (select auth.uid()));

-- 크리에이터 프로필 생성 (자기 자신만)
create policy "creators_insert_own"
  on creators for insert
  with check (user_id = (select auth.uid()));

-- 크리에이터는 자신의 행만 수정 가능
create policy "creators_update_own"
  on creators for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ============================================================
-- 3. quests 테이블 정책
-- ============================================================

-- 인증된 사용자: 비공개가 아닌 퀘스트 조회 가능
-- 비공개 퀘스트는 조건에 맞는 크리에이터만 조회 가능
create policy "quests_select_public"
  on quests for select
  using (
    is_private = false
    or exists (
      select 1 from creators c
      where c.user_id = (select auth.uid())
        and (
          quests.min_subscribers is null
          or c.subscriber_count >= quests.min_subscribers
        )
        and (
          quests.allowed_categories is null
          or quests.allowed_categories && c.categories
        )
        and (
          quests.allowed_channel_ids is null
          or c.channel_id = any(quests.allowed_channel_ids)
        )
    )
  );

-- 인증된 사용자는 퀘스트 생성 가능 (AI 또는 광고주)
create policy "quests_insert_authenticated"
  on quests for insert
  with check ((select auth.uid()) is not null);

-- 퀘스트 수정: 할당된 크리에이터 또는 시스템(service_role)만
create policy "quests_update"
  on quests for update
  using ((select auth.uid()) is not null);

-- ============================================================
-- 4. sub_quests 테이블 정책
-- ============================================================

-- 부모 퀘스트를 볼 수 있는 사람은 서브퀘스트도 조회 가능
create policy "sub_quests_select"
  on sub_quests for select
  using (
    exists (
      select 1 from quests q
      where q.id = sub_quests.quest_id
        and (
          q.is_private = false
          or exists (
            select 1 from creators c
            where c.user_id = (select auth.uid())
              and (q.min_subscribers is null or c.subscriber_count >= q.min_subscribers)
              and (q.allowed_categories is null or q.allowed_categories && c.categories)
              and (q.allowed_channel_ids is null or c.channel_id = any(q.allowed_channel_ids))
          )
        )
    )
  );

-- 인증된 사용자는 서브퀘스트 생성 가능
create policy "sub_quests_insert_authenticated"
  on sub_quests for insert
  with check ((select auth.uid()) is not null);

-- 서브퀘스트 수정: 인증된 사용자
create policy "sub_quests_update_authenticated"
  on sub_quests for update
  using ((select auth.uid()) is not null);

-- ============================================================
-- 5. pledges 테이블 정책
-- ============================================================

-- 사용자는 자신의 후원만 조회 가능
create policy "pledges_select_own"
  on pledges for select
  using (user_id = (select auth.uid()));

-- 인증된 사용자는 후원(결제) 가능
create policy "pledges_insert_authenticated"
  on pledges for insert
  with check (user_id = (select auth.uid()));

-- 자신의 후원만 수정 가능 (환불 등)
create policy "pledges_update_own"
  on pledges for update
  using (user_id = (select auth.uid()));

-- ============================================================
-- 6. videos 테이블 정책
-- ============================================================

-- 크리에이터는 자신의 영상 조회 가능
-- 일반 사용자는 approved/published 영상만 조회 가능
create policy "videos_select"
  on videos for select
  using (
    exists (
      select 1 from creators c
      where c.id = videos.creator_id
        and c.user_id = (select auth.uid())
    )
    or status in ('approved', 'published')
  );

-- 크리에이터만 영상 업로드 가능 (자기 creator_id만)
create policy "videos_insert_creator"
  on videos for insert
  with check (
    exists (
      select 1 from creators c
      where c.id = videos.creator_id
        and c.user_id = (select auth.uid())
    )
  );

-- 크리에이터는 자신의 영상만 수정 가능
create policy "videos_update_creator"
  on videos for update
  using (
    exists (
      select 1 from creators c
      where c.id = videos.creator_id
        and c.user_id = (select auth.uid())
    )
  );

-- ============================================================
-- 7. settlements 테이블 정책
-- ============================================================

-- 크리에이터는 자신의 정산 내역만 조회 가능
create policy "settlements_select_own"
  on settlements for select
  using (
    exists (
      select 1 from creators c
      where c.id = settlements.creator_id
        and c.user_id = (select auth.uid())
    )
  );

-- ============================================================
-- 8. disputes 테이블 정책
-- ============================================================

-- 인증된 사용자는 이의신청 생성 가능
create policy "disputes_insert_authenticated"
  on disputes for insert
  with check (reporter_id = (select auth.uid()));

-- 신고자는 자신의 이의신청만 조회 가능
create policy "disputes_select_own"
  on disputes for select
  using (reporter_id = (select auth.uid()));
