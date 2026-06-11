import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

if (!API_KEY) {
  console.warn('[Gemini] EXPO_PUBLIC_GEMINI_API_KEY が設定されていません');
}

const genAI = new GoogleGenerativeAI(API_KEY);

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function generateAIResponse(
  userMessage: string,
  systemInstruction?: string
): Promise<string> {
  if (!API_KEY) {
    throw new Error('Gemini APIキーが設定されていません。.envファイルにEXPO_PUBLIC_GEMINI_API_KEYを設定してください。');
  }

  console.log('[Gemini] AI応答生成開始:', userMessage.substring(0, 50) + '...');

  const maxRetries = 3;
  let lastError: any = null;

  const defaultInstruction = 'あなたはAWSクラウドプラクティショナーの合格を支援するプロ講師です。ユーザーの質問に対し、必ず【3〜4行程度の簡潔な解説】または【3つ以内の短い箇条書き】で回答してください。挨拶や前置きは一切不要です。フラッシュカードにそのまま登録できる短さと分かりやすさを徹底してください。';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
        console.log(`[Gemini] リトライ ${attempt}/${maxRetries} (${waitTime}ms後)`);
        await sleep(waitTime);
      }

      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: systemInstruction || defaultInstruction,
      });
      const result = await model.generateContent(userMessage);
      const response = result.response;
      const text = response.text();

      console.log('[Gemini] AI応答生成成功:', text.substring(0, 50) + '...');
      return text;
    } catch (error: any) {
      lastError = error;
      const is503 = error?.message?.includes('503') || error?.message?.includes('high demand');

      if (is503 && attempt < maxRetries) {
        console.log(`[Gemini] 503エラー（サーバー混雑中）- リトライします (${attempt}/${maxRetries})`);
        continue;
      }

      console.error('[Gemini] AI応答生成エラー:', {
        message: error?.message,
        attempt,
      });
      break;
    }
  }

  if (lastError?.message?.includes('503') || lastError?.message?.includes('high demand')) {
    throw new Error('現在Gemini APIが混雑しています。少し時間をおいて再度お試しください。');
  }

  throw new Error(`Gemini APIエラー: ${lastError?.message || '不明なエラー'}`);
}

export interface NoteMetadata {
  title: string;
  category: string;
  item_type: 'term' | 'memo' | 'question';
}

export async function analyzeNoteContent(text: string): Promise<NoteMetadata> {
  if (!API_KEY) {
    throw new Error('Gemini APIキーが設定されていません。.envファイルにEXPO_PUBLIC_GEMINI_API_KEYを設定してください。');
  }

  console.log('[Gemini] ノート解析開始:', text.substring(0, 50) + '...');

  const systemInstruction = `あなたはAWSクラウドプラクティショナー試験の学習ノートを整理するアシスタントです。
ユーザーが保存したいテキストを分析し、以下のJSONフォーマット"のみ"を返してください。
他の説明や前置きは一切不要です。

{
  "title": "抽出された用語名（例: VPC, S3）や適切なタイトル（15文字以内推奨）",
  "item_type": "term (用語・概念の説明), memo (学習メモ・覚え書き), question (問題・クイズ形式) のいずれか",
  "category": "item_typeに応じたカテゴリから最も適切なもの1つ"
}

【重要】判定手順:
1. まず item_type を判定してください
2. その item_type に応じたカテゴリ候補から category を選択してください

item_type判定基準:
- 用語の定義や技術的な説明 → "term"
- 学習中の気づき、メモ、タスク → "memo"
- 問題文、選択肢、クイズ形式 → "question"

category判定（item_typeに応じて異なります）:

【term の場合のカテゴリ候補】
- VPC/サブネット/セキュリティグループ → ネットワーク
- IAM/KMS/暗号化 → セキュリティ
- RDS/DynamoDB/Aurora → データベース
- EC2/Lambda/ECS → コンピューティング
- S3/EBS/Glacier → ストレージ
- 上記に該当しない → その他

【memo の場合のカテゴリ候補】
- 学習の気づき、振り返り → 考えたこと
- やるべきこと、TODOリスト → タスク
- 学習方法、効率化のアイデア → 勉強法
- 授業や講義の記録 → 授業メモ
- 上記に該当しない → その他

【question の場合のカテゴリ候補】
- AWSの基本概念、クラウドの利点 → クラウドの概念
- IAM、暗号化、コンプライアンス → セキュリティとコンプライアンス
- サービスの機能、使い方 → テクノロジー
- 料金体系、コスト最適化 → 請求と料金`;

  const maxRetries = 2;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        const waitTime = 1000 * attempt;
        console.log(`[Gemini] 解析リトライ ${attempt}/${maxRetries} (${waitTime}ms後)`);
        await sleep(waitTime);
      }

      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction,
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json',
        },
      });

      const result = await model.generateContent(text);
      const response = result.response;
      const jsonText = response.text();

      console.log('[Gemini] 解析結果（Raw）:', jsonText);

      const parsed = JSON.parse(jsonText) as NoteMetadata;

      // バリデーション
      const validTypes = ['term', 'memo', 'question'];

      if (!parsed.title || typeof parsed.title !== 'string') {
        throw new Error('titleが不正です');
      }
      if (!validTypes.includes(parsed.item_type)) {
        parsed.item_type = 'memo';
      }
      if (!parsed.category || typeof parsed.category !== 'string') {
        parsed.category = 'その他';
      }

      console.log('[Gemini] ノート解析成功:', parsed);
      return parsed;
    } catch (error: any) {
      lastError = error;
      console.error('[Gemini] ノート解析エラー:', {
        message: error?.message,
        attempt,
      });

      if (attempt < maxRetries) {
        continue;
      }
    }
  }

  console.warn('[Gemini] ノート解析失敗 - デフォルト値を返します');
  // フォールバック: 解析失敗時はデフォルト値を返す
  return {
    title: text.substring(0, 20).trim() + (text.length > 20 ? '...' : ''),
    category: 'その他',
    item_type: 'memo',
  };
}
