import { createHash, timingSafeEqual } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

export const maxDuration = 60;

// 画面側で長辺1568pxのJPEGに縮小して送る前提。Vercelのリクエスト上限(4.5MB)に収める
const MAX_BASE64_LENGTH = 4_000_000;

const Estimate = z.object({
  isFood: z.boolean().describe("写真に食べ物・飲み物が写っているか"),
  items: z.array(
    z.object({
      name: z.string().describe("料理・食品の名前（日本語）"),
      amount: z.string().describe("見た目から推定した分量（例: 茶碗1杯・約150g）"),
      kcal: z.number().int().describe("その分量の推定カロリー（kcal）"),
    }),
  ),
  note: z.string().describe("推定の前提や不確かな点を1〜2文で（日本語）"),
});

const SYSTEM = `あなたは管理栄養士の知識を持つ、食事記録アプリのアシスタントです。
利用者が撮った食事の写真から、写っている料理・食品を見分け、それぞれの分量と摂取カロリーを推定します。

- 料理は1品ずつ分けて挙げてください（定食なら、ごはん・味噌汁・主菜・副菜を別々に）。
- 分量は、器や箸などの写り込みを手がかりに、見た目から現実的に見積もってください。
- カロリーは日本の一般的な食品成分値をもとに、その分量に対する値を整数で出してください。
- 判別しにくいものは、最もありそうな料理名で推定し、その旨を note に書いてください。
- 写真に食べ物も飲み物も写っていない場合は、isFood を false、items を空にしてください。
- name・amount・note はすべて日本語で書いてください。`;

function sha256(text: string): Buffer {
  return createHash("sha256").update(text).digest();
}

function json(body: unknown, status: number) {
  return Response.json(body, { status });
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return json({ error: "写真の解析はまだ設定されていません（ANTHROPIC_API_KEY が未設定です）。" }, 503);
  }

  // APP_PASSCODE を設定している場合は、合言葉が一致する人だけが解析を使える
  const passcode = process.env.APP_PASSCODE;
  if (passcode) {
    const given = request.headers.get("x-app-passcode") ?? "";
    if (!timingSafeEqual(sha256(given), sha256(passcode))) {
      return json({ error: "合言葉が違います。", needsPasscode: true }, 401);
    }
  }

  let image: unknown;
  try {
    ({ image } = (await request.json()) as { image?: unknown });
  } catch {
    return json({ error: "リクエストの形式が正しくありません。" }, 400);
  }
  if (typeof image !== "string" || image === "" || !/^[A-Za-z0-9+/]+=*$/.test(image)) {
    return json({ error: "画像を読み取れませんでした。" }, 400);
  }
  if (image.length > MAX_BASE64_LENGTH) {
    return json({ error: "画像が大きすぎます。" }, 413);
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
            { type: "text", text: "この写真の食事について、料理ごとの分量とカロリーを推定してください。" },
          ],
        },
      ],
      output_config: { effort: "low", format: zodOutputFormat(Estimate) },
    });

    if (response.stop_reason === "refusal") {
      return json({ error: "この写真は解析できませんでした。別の写真でお試しください。" }, 422);
    }
    const estimate = response.parsed_output;
    if (!estimate) {
      return json({ error: "解析結果を読み取れませんでした。もう一度お試しください。" }, 502);
    }
    if (!estimate.isFood || estimate.items.length === 0) {
      return json({ error: "食べ物が見つかりませんでした。料理がはっきり写った写真でお試しください。" }, 422);
    }

    return json(
      {
        items: estimate.items.map((item) => ({ ...item, kcal: Math.max(0, Math.round(item.kcal)) })),
        note: estimate.note,
      },
      200,
    );
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return json({ error: "APIキーが正しくありません。設定を確認してください。" }, 500);
    }
    if (error instanceof Anthropic.RateLimitError) {
      return json({ error: "ただいま混み合っています。少し待ってからお試しください。" }, 429);
    }
    if (error instanceof Anthropic.APIConnectionError) {
      return json({ error: "解析サービスに接続できませんでした。もう一度お試しください。" }, 502);
    }
    if (error instanceof Anthropic.APIError) {
      console.error("analyze failed", error.status, error.message);
      return json({ error: "解析に失敗しました。もう一度お試しください。" }, 502);
    }
    throw error;
  }
}
