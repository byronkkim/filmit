/**
 * Google Gemini API 유틸
 * YouTube URL을 직접 전달해서 영상 내용 분석
 */

import { GoogleGenAI } from '@google/genai';

export interface SubQuestCheckInput {
  id: string;
  description: string;
}

export interface SubQuestCheckResult {
  id: string;
  achieved: boolean;
  evidence: string;  // "03:22 등산 장면" 같은 구체적 근거
}

export interface VideoVerificationResult {
  main_match_score: number;       // 0~100
  main_reason: string;            // 판정 근거
  main_highlights: string[];      // 타임스탬프 포함 주요 장면
  sub_quest_checks: SubQuestCheckResult[];
}

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY 환경변수가 설정되지 않았습니다.');
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * YouTube 영상을 Gemini로 분석하여 퀘스트 충족 여부 판정
 */
export async function verifyVideoAgainstQuest(params: {
  videoUrl: string;
  questTitle: string;
  questDescription: string;
  mainConditions: string[];      // 필수 조건 리스트
  subQuests: SubQuestCheckInput[]; // 서브퀘스트 (별 부여용)
}): Promise<VideoVerificationResult> {
  const { videoUrl, questTitle, questDescription, mainConditions, subQuests } = params;

  const client = getClient();

  const prompt = `당신은 YouTube 영상이 특정 퀘스트(요청 사항)를 충족하는지 객관적으로 판정하는 AI입니다.

# 퀘스트 정보
제목: ${questTitle}
설명: ${questDescription}

# 필수 조건 (메인 퀘스트)
${mainConditions.length > 0 ? mainConditions.map((c, i) => `${i + 1}. ${c}`).join('\n') : '(없음)'}

# 서브퀘스트 조건 (보너스 별 부여 기준)
${subQuests.length > 0
  ? subQuests.map(sq => `- id=${sq.id}: ${sq.description}`).join('\n')
  : '(없음)'}

# 판정 지침
1. 영상을 끝까지 시청하고 퀘스트 주제와의 일치도를 **0~100점**으로 채점
2. 영상의 제목/설명이 아닌 **영상 내용 자체**를 근거로 판단
3. 주요 장면은 **타임스탬프 포함** (예: "03:22 등산 장면 확인")
4. 서브퀘스트 각각에 대해 achieved(true/false)와 구체적 근거(evidence) 반환
5. 확신이 없으면 achieved=false로 보수적 판정

# 출력 형식 (JSON만, 다른 텍스트 금지)
{
  "main_match_score": <0~100 정수>,
  "main_reason": "<한국어 1~2문장 판정 근거>",
  "main_highlights": ["<타임스탬프> <설명>", ...],
  "sub_quest_checks": [
    { "id": "<서브퀘스트 id>", "achieved": <true/false>, "evidence": "<타임스탬프 + 근거>" },
    ...
  ]
}`;

  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          {
            fileData: {
              fileUri: videoUrl,
              mimeType: 'video/*',
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      temperature: 0.2,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('Gemini 응답이 비어있습니다.');
  }

  let parsed: VideoVerificationResult;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    console.error('Gemini JSON 파싱 실패:', text);
    throw new Error('Gemini 응답을 파싱할 수 없습니다.');
  }

  // 값 검증 + 정규화
  const score = Math.max(0, Math.min(100, Math.round(parsed.main_match_score ?? 0)));
  return {
    main_match_score: score,
    main_reason: parsed.main_reason ?? '',
    main_highlights: Array.isArray(parsed.main_highlights) ? parsed.main_highlights : [],
    sub_quest_checks: Array.isArray(parsed.sub_quest_checks) ? parsed.sub_quest_checks : [],
  };
}
