# 食事管理ノート

日々の体重・体脂肪率、食べたもの、消費カロリーを記録し、グラフで振り返る Web アプリです。

- **記録**（`/`）: 日付ごとに体重・体脂肪率・消費カロリーと、食事（朝食／昼食／夕食／間食）を入力
- **グラフ**（`/charts`）: 体重・体脂肪率・カロリーの推移を 7日／30日／90日／全期間で表示

## データの保存先

記録は**お使いのブラウザの中（localStorage）だけ**に保存されます。サーバーには送信されません。

- 別の端末や別のブラウザとは共有されません
- ブラウザのサイトデータを削除すると記録も消えます
- グラフ画面の「データのバックアップ」から、JSON ファイルへの書き出し・読み込みができます
- グラフ画面の「CSVで出力」から、日ごとの記録と食事の明細を CSV ファイル（Excel 対応）で出力できます

## 手元で動かす

[Node.js](https://nodejs.org/ja)（20.9 以上）が必要です。

```
npm install
npm run dev
```

ブラウザで http://localhost:3000 を開きます。

## Vercel にデプロイする

追加の設定や環境変数は不要です。

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
| `components/Charts.tsx` | Recharts によるグラフ |
| `components/NumberField.tsx` | 数値入力欄 |
| `lib/records.ts` | データ型と localStorage への保存・読み込み |
| `lib/csv.ts` | CSV の生成 |
