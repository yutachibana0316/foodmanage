"use client";

import { useEffect, useState } from "react";
import NumberField, { parseNumber } from "@/components/NumberField";
import PhotoEstimate from "@/components/PhotoEstimate";
import {
  MEAL_CATEGORIES,
  type MealCategory,
  emptyDay,
  fromDateKey,
  intakeOf,
  shiftDateKey,
  toDateKey,
  useRecords,
} from "@/lib/records";

function formatLongDate(key: string): string {
  return fromDateKey(key).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

export default function RecordPage() {
  const { records, loaded, updateDay } = useRecords();
  const [dateKey, setDateKey] = useState("");
  const [category, setCategory] = useState<MealCategory>("朝食");
  const [mealName, setMealName] = useState("");
  const [mealKcal, setMealKcal] = useState("");

  // 「今日」は閲覧している端末の日付で決めるので、マウント後に設定する
  useEffect(() => {
    setDateKey(toDateKey(new Date()));
  }, []);

  if (!loaded || dateKey === "") {
    return <p className="muted">読み込み中…</p>;
  }

  const today = toDateKey(new Date());
  const day = records[dateKey] ?? emptyDay;
  const intake = intakeOf(day);
  const balance = day.burned === undefined ? undefined : intake - day.burned;
  const kcal = parseNumber(mealKcal);
  const canAdd = mealName.trim() !== "" && kcal !== undefined;

  function addMeal(e: React.FormEvent) {
    e.preventDefault();
    if (!canAdd) return;
    updateDay(dateKey, (d) => ({
      ...d,
      meals: [
        ...d.meals,
        { id: crypto.randomUUID(), category, name: mealName.trim(), kcal: Math.round(kcal) },
      ],
    }));
    setMealName("");
    setMealKcal("");
  }

  function addEstimatedMeals(items: { name: string; kcal: number }[]) {
    updateDay(dateKey, (d) => ({
      ...d,
      meals: [...d.meals, ...items.map((item) => ({ id: crypto.randomUUID(), category, ...item }))],
    }));
  }

  function removeMeal(id: string) {
    updateDay(dateKey, (d) => ({ ...d, meals: d.meals.filter((meal) => meal.id !== id) }));
  }

  return (
    <>
      <section className="date-bar" aria-label="記録する日付">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setDateKey(shiftDateKey(dateKey, -1))}
          aria-label="前の日"
        >
          ‹
        </button>
        <div className="date-current">
          <strong>{formatLongDate(dateKey)}</strong>
          <input
            type="date"
            value={dateKey}
            max={today}
            aria-label="日付を選ぶ"
            onChange={(e) => e.target.value && setDateKey(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setDateKey(shiftDateKey(dateKey, 1))}
          disabled={dateKey >= today}
          aria-label="次の日"
        >
          ›
        </button>
        {dateKey !== today && (
          <button type="button" className="btn btn-ghost" onClick={() => setDateKey(today)}>
            今日
          </button>
        )}
      </section>

      <section className="tiles" aria-label="この日のカロリー">
        <div className="tile">
          <span className="tile-label">摂取カロリー</span>
          <span className="tile-value">
            {intake.toLocaleString()}
            <small> kcal</small>
          </span>
        </div>
        <div className="tile">
          <span className="tile-label">消費カロリー</span>
          <span className="tile-value">
            {day.burned === undefined ? "—" : day.burned.toLocaleString()}
            <small> kcal</small>
          </span>
        </div>
        <div className="tile">
          <span className="tile-label">収支（摂取 - 消費）</span>
          <span className="tile-value">
            {balance === undefined
              ? "—"
              : `${balance > 0 ? "+" : balance < 0 ? "-" : ""}${Math.abs(balance).toLocaleString()}`}
            <small> kcal</small>
          </span>
        </div>
      </section>

      <section className="card">
        <h2>体の記録</h2>
        {/* 日付ごとに入力欄を作り直して、表示中の文字列をその日の値に合わせる */}
        <div className="field-row" key={dateKey}>
          <NumberField
            label="体重"
            unit="kg"
            placeholder="例: 62.4"
            value={day.weight}
            onChange={(weight) => updateDay(dateKey, (d) => ({ ...d, weight }))}
          />
          <NumberField
            label="体脂肪率"
            unit="%"
            placeholder="例: 21.5"
            value={day.bodyFat}
            onChange={(bodyFat) => updateDay(dateKey, (d) => ({ ...d, bodyFat }))}
          />
          <NumberField
            label="消費カロリー"
            unit="kcal"
            placeholder="例: 2100"
            value={day.burned}
            onChange={(burned) => updateDay(dateKey, (d) => ({ ...d, burned }))}
          />
        </div>
        <p className="hint">入力した内容は自動で保存されます。</p>
      </section>

      <section className="card">
        <h2>食べたもの</h2>
        <form className="meal-form" onSubmit={addMeal}>
          <label className="field">
            <span className="field-label">区分</span>
            <select value={category} onChange={(e) => setCategory(e.target.value as MealCategory)}>
              {MEAL_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="field field-grow">
            <span className="field-label">食べたもの</span>
            <input
              type="text"
              value={mealName}
              placeholder="例: 鮭おにぎり"
              onChange={(e) => setMealName(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">カロリー</span>
            <span className="input-with-unit">
              <input
                type="text"
                inputMode="numeric"
                value={mealKcal}
                placeholder="例: 180"
                onChange={(e) => setMealKcal(e.target.value)}
              />
              <span className="unit">kcal</span>
            </span>
          </label>
          <button type="submit" className="btn btn-primary" disabled={!canAdd}>
            追加
          </button>
        </form>

        <PhotoEstimate category={category} onCategoryChange={setCategory} onAdd={addEstimatedMeals} />

        {day.meals.length === 0 ? (
          <p className="muted empty">この日の食事はまだ記録されていません。</p>
        ) : (
          MEAL_CATEGORIES.map((c) => {
            const meals = day.meals.filter((meal) => meal.category === c);
            if (meals.length === 0) return null;
            const subtotal = meals.reduce((sum, meal) => sum + meal.kcal, 0);
            return (
              <div className="meal-group" key={c}>
                <div className="meal-group-head">
                  <h3>{c}</h3>
                  <span className="muted">{subtotal.toLocaleString()} kcal</span>
                </div>
                <ul className="meal-list">
                  {meals.map((meal) => (
                    <li key={meal.id}>
                      <span className="meal-name">{meal.name}</span>
                      <span className="meal-kcal">{meal.kcal.toLocaleString()} kcal</span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-small"
                        onClick={() => removeMeal(meal.id)}
                        aria-label={`${meal.name}を削除`}
                      >
                        削除
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })
        )}
      </section>
    </>
  );
}
