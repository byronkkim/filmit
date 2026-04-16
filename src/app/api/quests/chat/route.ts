import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `당신은 filmit 플랫폼의 퀘스트 등록 도우미입니다.

사용자가 보고 싶은 영상에 대해 설명하면, 대화를 통해 요구사항을 파악하고 퀘스트로 정리합니다.

## 대화 규칙
1. 친근하고 자연스러운 한국어로 대화하세요
2. 사용자의 첫 메시지를 받으면, 핵심을 파악하고 부족한 정보를 1~2개만 질문하세요
3. 너무 많은 질문을 한번에 하지 마세요. 자연스러운 대화 흐름을 유지하세요
4. 충분한 정보가 모이면 (보통 2~3번 대화 후) 퀘스트를 정리해서 제안하세요

## 퀘스트 정리 시
정보가 충분하다고 판단되면, 반드시 아래 JSON 형식을 응답 마지막에 포함하세요:

\`\`\`quest_json
{
  "title": "퀘스트 제목 (간결하게, 20자 이내)",
  "description": "퀘스트 상세 설명 (영상에서 다뤄야 할 내용 요약)",
  "main_quests": ["필수 조건1", "필수 조건2"],
  "sub_quests": ["추가 조건1", "추가 조건2"]
}
\`\`\`

## 조건 분류 기준
- 필수 조건 (main_quests): 이것이 없으면 퀘스트 미달성. 핵심 요구사항 1~3개
- 추가 조건 (sub_quests): 있으면 좋지만 필수는 아닌 것. 0~5개

JSON을 포함할 때는 그 앞에 "이렇게 정리해봤어요! 확인해주세요." 같은 안내 메시지를 넣으세요.`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { messages } = await request.json() as {
    messages: { role: 'user' | 'assistant'; content: string }[];
  };

  // 첫 시스템 인사 메시지 제외
  const chatMessages = messages.filter(
    (m) => !(m.role === 'assistant' && m.content.includes('어떤 영상을 보고 싶으신가요'))
  );

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: chatMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // quest_json 블록 파싱
    const jsonMatch = text.match(/```quest_json\s*([\s\S]*?)```/);

    if (jsonMatch) {
      const quest = JSON.parse(jsonMatch[1].trim());
      const displayMessage = text.replace(/```quest_json[\s\S]*?```/, '').trim();

      return NextResponse.json({
        message: displayMessage,
        quest,
      });
    }

    return NextResponse.json({ message: text });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { message: '죄송합니다, 잠시 오류가 발생했어요. 다시 말씀해주세요.' },
      { status: 500 },
    );
  }
}
