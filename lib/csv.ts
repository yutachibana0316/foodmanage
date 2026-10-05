import type { Records } from "./records";

type Cell = string | number | undefined;

function escapeCell(cell: Cell): string {
  if (cell === undefined) return "";
  const text = String(cell);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// Excel で文字化けしないよう BOM を付け、改行は CRLF にする
function toCsv(rows: Cell[][]): string {
  return "﻿" + rows.map((row) => row.map(escapeCell).join(",")).join("\r\n") + "\r\n";
}

/** 1日1行：体重・体脂肪率・摂取カロリー・消費カロリー */
export function dailyCsv(records: Records): string {
  const rows: Cell[][] = [["日付", "体重(kg)", "体脂肪率(%)", "摂取カロリー(kcal)", "消費カロリー(kcal)"]];
  for (const key of Object.keys(records).sort()) {
    const day = records[key];
    const intake =
      day.meals.length > 0 ? day.meals.reduce((sum, meal) => sum + meal.kcal, 0) : undefined;
    rows.push([key, day.weight, day.bodyFat, intake, day.burned]);
  }
  return toCsv(rows);
}

/** 食事1件1行 */
export function mealsCsv(records: Records): string {
  const rows: Cell[][] = [["日付", "区分", "食べたもの", "カロリー(kcal)"]];
  for (const key of Object.keys(records).sort()) {
    for (const meal of records[key].meals) {
      rows.push([key, meal.category, meal.name, meal.kcal]);
    }
  }
  return toCsv(rows);
}
