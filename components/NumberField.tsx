"use client";

import { useState } from "react";

type Props = {
  label: string;
  unit: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
};

// 全角で入力された数字・小数点を半角にそろえる
function normalize(text: string): string {
  return text
    .replace(/[０-９．]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .trim();
}

export function parseNumber(text: string): number | undefined {
  const normalized = normalize(text);
  if (normalized === "") return undefined;
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/**
 * 入力途中の文字列（"65." など）を保つため、表示用の文字列は内部で持つ。
 * 日付を切り替えるときは key を変えて作り直すこと。
 */
export default function NumberField({ label, unit, value, onChange, placeholder }: Props) {
  const [text, setText] = useState(value === undefined ? "" : String(value));
  const invalid = normalize(text) !== "" && parseNumber(text) === undefined;

  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="input-with-unit">
        <input
          type="text"
          inputMode="decimal"
          value={text}
          placeholder={placeholder}
          aria-invalid={invalid}
          onChange={(e) => {
            setText(e.target.value);
            const parsed = parseNumber(e.target.value);
            if (parsed !== undefined || normalize(e.target.value) === "") onChange(parsed);
          }}
        />
        <span className="unit">{unit}</span>
      </span>
    </label>
  );
}
