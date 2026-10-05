"use client";

import { useCallback, useEffect, useState } from "react";

export const MEAL_CATEGORIES = ["朝食", "昼食", "夕食", "間食"] as const;
export type MealCategory = (typeof MEAL_CATEGORIES)[number];

export type Meal = {
  id: string;
  category: MealCategory;
  name: string;
  kcal: number;
};

export type DayRecord = {
  weight?: number;
  bodyFat?: number;
  burned?: number;
  meals: Meal[];
};

/** キーは YYYY-MM-DD（端末のローカル日付） */
export type Records = Record<string, DayRecord>;

const STORAGE_KEY = "meal-log:records:v1";

export const emptyDay: DayRecord = { meals: [] };

// toISOString はUTC基準で日付がずれるため、ローカル時刻から組み立てる
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function shiftDateKey(key: string, days: number): string {
  const date = fromDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function intakeOf(day: DayRecord): number {
  return day.meals.reduce((sum, meal) => sum + meal.kcal, 0);
}

function isEmpty(day: DayRecord): boolean {
  return (
    day.weight === undefined &&
    day.bodyFat === undefined &&
    day.burned === undefined &&
    day.meals.length === 0
  );
}

function load(): Records {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Records) : {};
  } catch {
    return {};
  }
}

export function isRecords(value: unknown): value is Records {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return Object.entries(value).every(
    ([key, day]) =>
      /^\d{4}-\d{2}-\d{2}$/.test(key) &&
      typeof day === "object" &&
      day !== null &&
      Array.isArray((day as DayRecord).meals),
  );
}

export function useRecords() {
  const [records, setRecords] = useState<Records>({});
  const [loaded, setLoaded] = useState(false);

  // localStorage はブラウザにしかないので、マウント後に読み込む
  useEffect(() => {
    setRecords(load());
    setLoaded(true);
  }, []);

  const persist = useCallback((next: Records) => {
    setRecords(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // 保存できなくても画面上の入力は維持する
    }
  }, []);

  const updateDay = useCallback(
    (key: string, update: (day: DayRecord) => DayRecord) => {
      const next = { ...records };
      const day = update(records[key] ?? emptyDay);
      if (isEmpty(day)) delete next[key];
      else next[key] = day;
      persist(next);
    },
    [records, persist],
  );

  return { records, loaded, updateDay, replaceAll: persist };
}
