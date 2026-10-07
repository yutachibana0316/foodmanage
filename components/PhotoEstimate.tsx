"use client";

import { useRef, useState } from "react";
import { parseNumber } from "@/components/NumberField";
import { MEAL_CATEGORIES, type MealCategory } from "@/lib/records";

type Props = {
  category: MealCategory;
  onCategoryChange: (category: MealCategory) => void;
  onAdd: (items: { name: string; kcal: number }[]) => void;
};

type Row = { id: number; checked: boolean; name: string; amount: string; kcal: string };

type State =
  | { status: "idle" }
  | { status: "loading"; preview: string }
  | { status: "error"; preview?: string; message: string }
  | { status: "done"; preview: string; rows: Row[]; note: string };

const PASSCODE_KEY = "meal-log:passcode";
// 送信量と解析コストを抑えるため、長辺をこの大きさまで縮小する
const MAX_EDGE = 1568;

function readPasscode(): string {
  try {
    return window.localStorage.getItem(PASSCODE_KEY) ?? "";
  } catch {
    return "";
  }
}

async function toJpegDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

export default function PhotoEstimate({ category, onCategoryChange, onAdd }: Props) {
  const [state, setState] = useState<State>({ status: "idle" });
  const [needsPasscode, setNeedsPasscode] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const busy = state.status === "loading";

  async function analyze(preview: string, code: string) {
    setState({ status: "loading", preview });
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-app-passcode": code },
        body: JSON.stringify({ image: preview.slice(preview.indexOf(",") + 1) }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.needsPasscode) setNeedsPasscode(true);
        setState({ status: "error", preview, message: data.error ?? "解析に失敗しました。" });
        return;
      }
      setNeedsPasscode(false);
      const items = data.items as { name: string; amount: string; kcal: number }[];
      setState({
        status: "done",
        preview,
        note: data.note,
        rows: items.map((item, id) => ({ id, checked: true, ...item, kcal: String(item.kcal) })),
      });
    } catch {
      setState({ status: "error", preview, message: "通信に失敗しました。もう一度お試しください。" });
    }
  }

  async function onFile(file: File) {
    let preview: string;
    try {
      preview = await toJpegDataUrl(file);
    } catch {
      setState({
        status: "error",
        message: "この画像は読み込めませんでした。JPEG か PNG の写真でお試しください。",
      });
      return;
    }
    await analyze(preview, readPasscode());
  }

  function submitPasscode(e: React.FormEvent) {
    e.preventDefault();
    try {
      window.localStorage.setItem(PASSCODE_KEY, passcode);
    } catch {
      // 保存できなくても今回の解析には使う
    }
    if (state.status === "error" && state.preview) void analyze(state.preview, passcode);
  }

  function updateRow(id: number, patch: Partial<Row>) {
    if (state.status !== "done") return;
    setState({ ...state, rows: state.rows.map((row) => (row.id === id ? { ...row, ...patch } : row)) });
  }

  const selected =
    state.status === "done"
      ? state.rows
          .filter((row) => row.checked && row.name.trim() !== "")
          .map((row) => ({ name: row.name.trim(), kcal: parseNumber(row.kcal) }))
      : [];
  const valid = selected.filter((item): item is { name: string; kcal: number } => item.kcal !== undefined);
  const canAdd = valid.length > 0 && valid.length === selected.length;
  const total = valid.reduce((sum, item) => sum + item.kcal, 0);

  return (
    <div className="photo">
      <div
        className="photo-drop"
        data-dragging={dragging}
        onDragOver={(e) => {
          // preventDefault しないとドロップを受け取れない
          e.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={(e) => {
          // 子要素の上を通っただけでは解除しない
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (busy) return;
          const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/"));
          if (file) void onFile(file);
          else setState({ status: "error", message: "画像ファイルをドロップしてください。" });
        }}
      >
        <button
          type="button"
          className="btn btn-ghost"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
        >
          写真からカロリーを推定
        </button>
        <span className="muted">
          {dragging
            ? "ここにドロップして解析します。"
            : "料理の写真を選ぶか、ここにドラッグ＆ドロップすると、AIが料理名とカロリーを見積もります。"}
        </span>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {state.status !== "idle" && (
        <div className="photo-body">
          {state.preview && (
            <img className="photo-preview" src={state.preview} alt="選んだ食事の写真" />
          )}

          <div className="photo-result">
            {state.status === "loading" && (
              <p className="muted" role="status">
                解析中です…（10〜30秒ほどかかります）
              </p>
            )}

            {state.status === "error" && (
              <>
                <p className="photo-error" role="alert">
                  {state.message}
                </p>
                {needsPasscode && state.preview && (
                  <form className="passcode-form" onSubmit={submitPasscode}>
                    <label className="field field-grow">
                      <span className="field-label">合言葉</span>
                      <input
                        type="password"
                        value={passcode}
                        autoComplete="off"
                        onChange={(e) => setPasscode(e.target.value)}
                      />
                    </label>
                    <button type="submit" className="btn btn-primary" disabled={passcode === ""}>
                      もう一度解析
                    </button>
                  </form>
                )}
                <button type="button" className="btn btn-ghost" onClick={() => setState({ status: "idle" })}>
                  閉じる
                </button>
              </>
            )}

            {state.status === "done" && (
              <>
                <ul className="estimate-list">
                  {state.rows.map((row) => (
                    <li key={row.id}>
                      <input
                        type="checkbox"
                        checked={row.checked}
                        aria-label={`${row.name}を追加する`}
                        onChange={(e) => updateRow(row.id, { checked: e.target.checked })}
                      />
                      <span className="estimate-main">
                        <input
                          type="text"
                          value={row.name}
                          aria-label="料理名"
                          onChange={(e) => updateRow(row.id, { name: e.target.value })}
                        />
                        <span className="muted">{row.amount}</span>
                      </span>
                      <span className="input-with-unit estimate-kcal">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={row.kcal}
                          aria-label="カロリー"
                          aria-invalid={row.checked && parseNumber(row.kcal) === undefined}
                          onChange={(e) => updateRow(row.id, { kcal: e.target.value })}
                        />
                        <span className="unit">kcal</span>
                      </span>
                    </li>
                  ))}
                </ul>
                {state.note && <p className="hint">{state.note}</p>}
                <p className="hint">
                  AIによる見積もりです。実際の量や味付けで変わるため、必要に応じて数値を直してください。
                </p>
                <div className="estimate-actions">
                  <label className="field">
                    <span className="field-label">区分</span>
                    <select
                      value={category}
                      onChange={(e) => onCategoryChange(e.target.value as MealCategory)}
                    >
                      {MEAL_CATEGORIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!canAdd}
                    onClick={() => {
                      onAdd(valid.map((item) => ({ ...item, kcal: Math.round(item.kcal) })));
                      setState({ status: "idle" });
                    }}
                  >
                    {valid.length}件を追加（計 {Math.round(total).toLocaleString()} kcal）
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setState({ status: "idle" })}>
                    やめる
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
