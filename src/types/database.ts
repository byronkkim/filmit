// ============================================================
// filmit DB 타입 정의
// Supabase 스키마와 1:1 대응
// ============================================================

// ---------- Enums ----------

export type UserType = 'viewer' | 'advertiser' | 'creator';

export type QuestStatus =
  | 'draft'
  | 'open'
  | 'in_progress'
  | 'reviewing'
  | 'completed'
  | 'cancelled';

export type SubQuestStatus = 'pending' | 'achieved' | 'failed';

export type PledgeStatus =
  | 'pending'
  | 'escrowed'
  | 'released'
  | 'refunded'
  | 'partial_refund';

export type VideoStatus =
  | 'uploaded'
  | 'verifying'
  | 'approved'
  | 'manual_review'
  | 'rejected'
  | 'published';

export type SettlementStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type CreatorGrade = 'bronze' | 'silver' | 'gold' | 'platinum';

export type DisputeStatus = 'open' | 'auto_resolved' | 'admin_review' | 'closed';

// ---------- Row types ----------

export interface User {
  id: string;
  email: string;
  user_type: UserType;
  display_name: string;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export type KycType = 'individual' | 'business';

export interface Creator {
  id: string;
  user_id: string;
  channel_url: string;
  channel_id: string | null;
  channel_name: string | null;
  subscriber_count: number;
  categories: string[];
  grade: CreatorGrade;
  completed_quests: number;
  achievement_rate: number;
  dispute_rate: number;
  bank_code: string | null;
  account_number: string | null;
  account_holder: string | null;
  account_verified: boolean;
  abandoned_quests: number;
  suspended_until: string | null;
  kyc_type: KycType | null;
  kyc_encrypted: string | null;
  kyc_iv: string | null;
  kyc_verified: boolean;
  kyc_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  status: QuestStatus;
  creator_reward_amount: number;
  total_pledged_amount: number;
  creator_id: string | null;
  is_private: boolean;
  min_subscribers: number | null;
  allowed_categories: string[] | null;
  allowed_channel_ids: string[] | null;
  is_competitive: boolean;
  deadline_at: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubQuest {
  id: string;
  quest_id: string;
  description: string;
  is_main: boolean;
  status: SubQuestStatus;
  star_votes_yes: number;
  star_votes_no: number;
  created_at: string;
  updated_at: string;
}

export interface SubQuestVote {
  id: string;
  sub_quest_id: string;
  user_id: string;
  vote: boolean; // true = 달성, false = 미달성
  created_at: string;
}

export interface Pledge {
  id: string;
  quest_id: string;
  user_id: string;
  amount: number;
  platform_fee: number;
  pg_fee: number;
  total_paid: number;
  status: PledgeStatus;
  payment_key: string | null;
  order_id: string | null;
  refunded_at: string | null;
  refund_amount: number | null;
  created_at: string;
  updated_at: string;
}

export interface Video {
  id: string;
  quest_id: string;
  creator_id: string;
  video_url: string;
  youtube_video_id: string | null;
  youtube_published_at: string | null;
  duration_seconds: number | null;
  ai_verification_score: number | null;
  ai_verification_result: Record<string, unknown> | null;
  status: VideoStatus;
  objection_deadline_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Settlement {
  id: string;
  pledge_id: string;
  creator_id: string;
  gross_amount: number;
  withholding_tax: number;
  net_amount: number;
  status: SettlementStatus;
  receipt_url: string | null;
  settled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Dispute {
  id: string;
  video_id: string;
  reporter_id: string;
  reason: string;
  ai_judgement: Record<string, unknown> | null;
  status: DisputeStatus;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}
