"use client";

import { useRef, useState } from "react";
import { CalorieChart, type ChartPoint, TrendChart } from "@/components/Charts";
import { dailyCsv, mealsCsv } from "@/lib/csv";
import {
  type Records,
  fromDateKey,
  intakeOf,
  isRecords,
  shiftDateKey,
  toDateKey,
  useRecords,
} from "@/lib/records";

const RANGES = [
  { label: "7日", days: 7 },
  { label: "30日", days: 30 },
  { label: "90日", days: 90 },
  { label: "全期間", days: null },
] as const;

/** 期間内の全日付を並べ、記録のない日は null にする（横軸を実際の日数に合わせるため） */
function buildSeries(records: Records, days: number | null): ChartPoint[] {
  const today = toDateKey(new Date());
  const keys = Object.keys(records).sort();
  const first = keys[0] ?? today;
  const start = days === null ? first : shiftDateKey(today, -(days - 1));
  const end = keys.length > 0 && keys[keys.length - 1] > today ? keys[keys.length - 1] : today;

  const series: ChartPoint[] = [];
  for (let key = start; key <= end; key = shiftDateKey(key, 1)) {
    const day = records[key];
    series.push({
      date: key,
      weight: day?.weight ?? null,
      bodyFat: day?.bodyFat ?? null,
      intake: day && day.meals.length > 0 ? intakeOf(day) : null,
      burned: day?.burned ?? null,
    });
  }
  return series;
}

function values(series: ChartPoint[], key: keyof Omit<ChartPoint, "date">): number[] {
  return series.map((point) => point[key]).filter((v): v is number => v !== null);
}

function signed(n: number, digits: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "-" : "±";
  return `${sign}${Math.abs(n).toFixed(digits)}`;
}

function trendSummary(list: number[], unit: string): string {
  if (list.length === 0) return "";
  const latest = list[list.length - 1];
  if (list.length === 1) return `最新 ${latest.toFixed(1)} ${unit}`;
  return `最新 ${latest.toFixed(1)} ${unit}（期間内の変化 ${signed(latest - list[0], 1)} ${unit}）`;
}

function formatRowDate(key: string): string {
  return fromDateKey(key).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });
}

const cell = (value: number | null) => (value === null ? "—" : value.toLocaleString());
const decimalCell = (value: number | null) => (value === null ? "—" : value.toFixed(1));

export default function ChartsPage() {
  const { records, loaded, replaceAll } = useRecords();
  const [rangeIndex, setRangeIndex] = useState(1);
  const [message, setMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  if (!loaded) {
    return <p className="muted">読み込み中…</p>;
  }

  const series = buildSeries(records, RANGES[rangeIndex].days);
  const weights = values(series, "weight");
  const bodyFats = values(series, "bodyFat");
  const intakes = values(series, "intake");
  const hasCalories = intakes.length > 0 || values(series, "burned").length > 0;
  const rows = series
    .filter((p) => p.weight !== null || p.bodyFat !== null || p.intake !== null || p.burned !== null)
    .reverse();

  function download(filename: string, content: string, type: string) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const stamp = toDateKey(new Date());
  const hasRecords = Object.keys(records).length > 0;

  async function importData(file: File) {
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isRecords(parsed)) throw new Error("invalid");
      const count = Object.keys(parsed).length;
      if (!window.confirm(`現在の記録を、ファイルの内容（${count}日分）で置き換えます。よろしいですか？`)) {
        return;
      }
      replaceAll(parsed);
      setMessage(`${count}日分の記録を読み込みました。`);
    } catch {
      setMessage("読み込めませんでした。このアプリで書き出したファイルを選んでください。");
    }
  }

  return (
    <>
      <div className="range-bar" role="group" aria-label="表示する期間">
        {RANGES.map((range, i) => (
          <button
            key={range.label}
            type="button"
            className="range-btn"
            aria-pressed={i === rangeIndex}
            onClick={() => setRangeIndex(i)}
          >
            {range.label}
          </button>
        ))}
      </div>

      <section className="card">
        <div className="card-head">
          <h2>体重</h2>
          <span className="muted">{trendSummary(weights, "kg")}</span>
        </div>
        {weights.length === 0 ? (
          <p className="muted empty">この期間の体重の記録はありません。</p>
        ) : (
          <TrendChart data={series} dataKey="weight" name="体重" unit="kg" />
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>体脂肪率</h2>
          <span className="muted">{trendSummary(bodyFats, "%")}</span>
        </div>
        {bodyFats.length === 0 ? (
          <p className="muted empty">この期間の体脂肪率の記録はありません。</p>
        ) : (
          <TrendChart data={series} dataKey="bodyFat" name="体脂肪率" unit="%" />
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>カロリー</h2>
          <span className="muted">
            {intakes.length > 0 &&
              `摂取の平均 ${Math.round(
                intakes.reduce((a, b) => a + b, 0) / intakes.length,
              ).toLocaleString()} kcal／日`}
          </span>
        </div>
        {hasCalories ? (
          <CalorieChart data={series} />
        ) : (
          <p className="muted empty">この期間のカロリーの記録はありません。</p>
        )}
      </section>

      <section className="card">
        <h2>記録の一覧</h2>
        {rows.length === 0 ? (
          <p className="muted empty">この期間の記録はありません。</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>日付</th>
                  <th>体重 (kg)</th>
                  <th>体脂肪率 (%)</th>
                  <th>摂取 (kcal)</th>
                  <th>消費 (kcal)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.date}>
                    <td>{formatRowDate(row.date)}</td>
                    <td>{decimalCell(row.weight)}</td>
                    <td>{decimalCell(row.bodyFat)}</td>
                    <td>{cell(row.intake)}</td>
                    <td>{cell(row.burned)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2>CSVで出力</h2>
        <p className="hint">
          Excel などの表計算ソフトで開ける形式です。表示中の期間にかかわらず、すべての記録を出力します。
        </p>
        <div className="actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!hasRecords}
            onClick={() => download(`meal-log-daily-${stamp}.csv`, dailyCsv(records), "text/csv")}
          >
            日ごとの記録を出力
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={!hasRecords}
            onClick={() => download(`meal-log-meals-${stamp}.csv`, mealsCsv(records), "text/csv")}
          >
            食事の明細を出力
          </button>
        </div>
      </section>

      <section className="card">
        <h2>データのバックアップ</h2>
        <p className="hint">
          記録はこのブラウザの中だけに保存されます。機種変更やブラウザのデータ削除に備えて、ときどきファイルに書き出しておくと安心です。
        </p>
        <div className="actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() =>
              download(`meal-log-${stamp}.json`, JSON.stringify(records, null, 2), "application/json")
            }
          >
            ファイルに書き出す
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => fileInput.current?.click()}>
            ファイルから読み込む
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importData(file);
              e.target.value = "";
            }}
          />
        </div>
        {message && (
          <p className="hint" role="status">
            {message}
          </p>
        )}
      </section>
    </>
  );
}
