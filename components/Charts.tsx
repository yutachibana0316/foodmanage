"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fromDateKey } from "@/lib/records";

export type ChartPoint = {
  date: string;
  weight: number | null;
  bodyFat: number | null;
  intake: number | null;
  burned: number | null;
};

// 2系列の組み合わせは色覚特性を考慮した検証を通した色
const SKY = "#0284c7";
const AMBER = "#d97706";
const GRID = "#e5e7eb";
const AXIS_TEXT = "#6b7280";

function shortDate(key: string): string {
  const date = fromDateKey(key);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function longDate(key: string): string {
  return fromDateKey(key).toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

const tick = { fill: AXIS_TEXT, fontSize: 12 };
const margin = { top: 8, right: 12, bottom: 0, left: 0 };

const tooltipProps = {
  labelFormatter: (label: unknown) => longDate(String(label)),
  contentStyle: {
    border: `1px solid ${GRID}`,
    borderRadius: 8,
    boxShadow: "0 4px 12px rgba(31, 41, 55, 0.08)",
    fontSize: 13,
  },
  labelStyle: { color: "#1f2937", fontWeight: 600, marginBottom: 2 },
  itemStyle: { color: "#1f2937" },
};

function xAxis() {
  return (
    <XAxis
      dataKey="date"
      tickFormatter={shortDate}
      tick={tick}
      tickLine={false}
      axisLine={{ stroke: GRID }}
      minTickGap={28}
      interval="preserveStartEnd"
    />
  );
}

type TrendProps = {
  data: ChartPoint[];
  dataKey: "weight" | "bodyFat";
  name: string;
  unit: string;
};

export function TrendChart({ data, dataKey, name, unit }: TrendProps) {
  const points = data.map((point) => point[dataKey]).filter((v): v is number => v !== null);
  const count = points.length;

  // 変化が読み取れるよう記録された範囲の前後に余白を取り、目盛りは等間隔の整数にする
  const low = Math.floor(Math.min(...points) - 0.5);
  const step = Math.max(1, Math.ceil((Math.ceil(Math.max(...points) + 0.5) - low) / 4));
  const ticks = [0, 1, 2, 3, 4].map((i) => low + step * i);

  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={margin}>
          <CartesianGrid stroke={GRID} vertical={false} />
          {xAxis()}
          <YAxis
            domain={[ticks[0], ticks[4]]}
            ticks={ticks}
            tick={tick}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip {...tooltipProps} />
          <Line
            type="linear"
            dataKey={dataKey}
            name={name}
            unit={` ${unit}`}
            stroke={SKY}
            strokeWidth={2}
            connectNulls
            // 点が多い期間では線だけにして見やすくする
            dot={count <= 31 ? { r: 4, fill: SKY, stroke: "#fff", strokeWidth: 2 } : false}
            activeDot={{ r: 5, fill: SKY, stroke: "#fff", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CalorieChart({ data }: { data: ChartPoint[] }) {
  const burnedCount = data.filter((point) => point.burned !== null).length;

  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={margin}>
          <CartesianGrid stroke={GRID} vertical={false} />
          {xAxis()}
          <YAxis
            tick={tick}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(value: number) => value.toLocaleString()}
          />
          <Tooltip {...tooltipProps} cursor={{ fill: "rgba(2, 132, 199, 0.06)" }} />
          <Legend
            verticalAlign="top"
            align="right"
            height={28}
            iconSize={10}
            formatter={(value) => <span style={{ color: "#1f2937", fontSize: 13 }}>{value}</span>}
          />
          <Bar
            dataKey="intake"
            name="摂取カロリー"
            unit=" kcal"
            fill={SKY}
            maxBarSize={24}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
          <Line
            type="linear"
            dataKey="burned"
            name="消費カロリー"
            unit=" kcal"
            stroke={AMBER}
            strokeWidth={2}
            connectNulls
            dot={burnedCount <= 31 ? { r: 4, fill: AMBER, stroke: "#fff", strokeWidth: 2 } : false}
            activeDot={{ r: 5, fill: AMBER, stroke: "#fff", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
