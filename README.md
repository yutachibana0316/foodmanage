# 食事管理ノート

日々の体重・体脂肪率、食べたもの、消費カロリーを記録し、グラフで振り返る Web アプリです。

- **記録**（`/`）: 日付ごとに体重・体脂肪率・消費カロリーと、食事（朝食／昼食／夕食／間食）を入力
- **グラフ**（`/charts`）: 体重・体脂肪率・カロリーの推移を 7日／30日／90日／全期間で表示

## データの保存先

記録は**お使いのブラウザの中（localStorage）だけ**に保存されます。サーバーには送信されません（写真の推定で選んだ写真を除く）。

- 別の端末や別のブラウザとは共有されません
- ブラウザのサイトデータを削除すると記録も消えます
- グラフ画面の「データのバックアップ」から、JSON ファイルへの書き出し・読み込みができます
- グラフ画面の「CSVで出力」から、日ごとの記録と食事の明細を CSV ファイル（Excel 対応）で出力できます

## 写真からのカロリー推定

記録画面の「写真からカロリーを推定」で料理の写真を選ぶと、AI（Claude）が料理名・分量・カロリーを見積もります。結果は確認・修正してから記録に追加できます。

- 写真は解析のために Anthropic の API へ送信されます。アプリには保存されません
- 見積もりは目安です。実際の量や味付けによって変わります
- 利用には Claude API のキーが必要で、解析のたびに API の利用料金がかかります

### 環境変数

| 名前 | 必須 | 内容 |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | 必須 | [Claude Console](https://platform.claude.com/) で発行した API キー |
| `APP_PASSCODE` | 任意（推奨） | 解析を使える人を限定する合言葉。設定すると、初回の解析時にアプリ上で入力を求められます |

`APP_PASSCODE` を設定しないと、アプリの URL を知っている人は誰でも解析を実行でき、その料金が API キーの持ち主にかかります。公開する場合は設定し、あわせて Claude Console で利用額の上限を決めておくと安心です。

未設定でも、写真の推定以外の機能はそのまま使えます。

## 手元で動かす

[Node.js](https://nodejs.org/ja)（20.9 以上）が必要です。

```
npm install
npm run dev
```

写真の推定を試す場合は、`.env.example` を `.env.local` という名前でコピーし、値を書き込んでから起動します。

ブラウザで http://localhost:3000 を開きます。

## Vercel にデプロイする

写真の推定を使う場合は、Vercel のプロジェクト設定「Settings → Environment Variables」に上の環境変数を登録し、再デプロイします。

### GitHub 経由（おすすめ）

1. このフォルダを GitHub のリポジトリにプッシュする
2. [Vercel](https://vercel.com/new) で「Add New… → Project」からそのリポジトリを選ぶ
3. Framework Preset が「Next.js」になっていることを確認して「Deploy」

以降は、プッシュするたびに自動で再デプロイされます。

### Vercel CLI

```
npx vercel          # プレビュー環境にデプロイ
npx vercel --prod   # 本番環境にデプロイ
```

## 構成

| パス | 内容 |
| --- | --- |
| `app/page.tsx` | 記録画面 |
| `app/charts/page.tsx` | グラフ画面 |
| `app/globals.css` | 全体のスタイル（色は先頭の CSS 変数で変更可能） |
| `app/api/analyze/route.ts` | 写真を Claude API に送り、料理とカロリーの推定を返す API |
| `components/PhotoEstimate.tsx` | 写真の選択と、推定結果の確認・追加 |
| `components/Charts.tsx` | Recharts によるグラフ |
| `components/NumberField.tsx` | 数値入力欄 |
| `lib/records.ts` | データ型と localStorage への保存・読み込み |
| `lib/csv.ts` | CSV の生成 |
