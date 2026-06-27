interface ValidateResult {
  valid: boolean;
  reason?: string;
}

interface DescriptionResult {
  text: string;
  category: string;
  english: string;
  emoji: string;
}

export async function validateWord(apiKey: string, word: string): Promise<ValidateResult> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `あなたは子ども向け図鑑アプリのバリデーターです。
入力されたひらがなの単語が以下の条件をすべて満たすか判定してください:
1. 実在する具体的な名詞であること
2. 子どもにとって安全な言葉であること（暴力・性的・恐怖を含まない）
3. 絵に描ける対象であること（抽象概念は不可）
4. 子どもが知っている、または知るべき対象であること

JSON形式で回答: {"valid": true/false, "reason": "理由（ひらがなで）"}`,
        },
        { role: "user", content: word },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
    }),
  });

  const data = await response.json<{ choices: Array<{ message: { content: string } }> }>();
  return JSON.parse(data.choices[0].message.content) as ValidateResult;
}

export async function generateDescription(apiKey: string, word: string): Promise<DescriptionResult> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `あなたは子ども向け図鑑アプリの説明文生成器です。
入力されたひらがなの単語について、以下のルールで説明文を生成してください:
1. すべてひらがなで記述（漢字・カタカナ不可）
2. 1文15文字以内
3. 3文で構成
4. 感覚的・具体的な表現を使用
5. 楽しく魅力的な内容

JSON形式で回答:
{
  "text": "ひらがなの説明文",
  "category": "カテゴリ名（どうぶつ/たべもの/のりもの/しぜん/むし/からだ/いえのもの/ふく/いろ/その他）",
  "english": "英語名（1単語）",
  "emoji": "代表的な絵文字1つ"
}`,
        },
        { role: "user", content: word },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
  });

  const data = await response.json<{ choices: Array<{ message: { content: string } }> }>();
  return JSON.parse(data.choices[0].message.content) as DescriptionResult;
}
