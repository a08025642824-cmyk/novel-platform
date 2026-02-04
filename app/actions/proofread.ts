'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

// .env.local に GOOGLE_API_KEY を設定しておいてください
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

export async function proofreadText(text: string) {
  if (!text) return { suggestions: [] };

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash' });

    // AIへの命令文（プロンプト）
    const prompt = `
      あなたはプロの小説編集者です。以下のテキストの「明らかな誤字脱字」や「変換ミス」だけを指摘してください。
      
      # ルール
      - 小説特有の表現、方言、砕けた口調は「修正不要」として無視すること。
      - 指摘はJSON形式で出力すること。
      - 形式: [{ "original": "誤った箇所", "suggestion": "修正案", "reason": "理由" }]
      - 指摘がない場合は空の配列 [] を返すこと。
      - JSON以外の余計な文字（マークダウン記号など）は含めないこと。

      # 対象テキスト
      ${text.slice(0, 10000)} // 文字数制限（念のため）
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const textResponse = response.text();

    // JSONをパースして返す
    // AIが ```json ... ``` で囲ってくる場合があるので整形
    const cleanedJson = textResponse.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanedJson);

  } catch (error) {
    console.error('Proofread error:', error);
    return { error: '校閲中にエラーが発生しました' };
  }
}