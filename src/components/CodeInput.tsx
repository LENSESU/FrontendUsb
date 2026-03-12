"use client";

import {
  useRef,
  useState,
  type KeyboardEvent,
  type ClipboardEvent,
  type ChangeEvent,
} from "react";

interface CodeInputProps {
  length?: number;
  onChange: (code: string) => void;
  hasError?: boolean;
  disabled?: boolean;
}

export default function CodeInput({
  length = 6,
  onChange,
  hasError = false,
  disabled = false,
}: CodeInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(""));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;

    const val = e.target.value;
    if (!/^\d*$/.test(val)) return;

    const newValues = [...values];
    newValues[index] = val.slice(-1);
    setValues(newValues);
    onChange(newValues.join(""));

    if (val && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "Backspace" && !values[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    e.preventDefault();
    const paste = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length);

    const newValues = [...values];
    for (let i = 0; i < paste.length; i++) {
      newValues[i] = paste[i];
    }
    setValues(newValues);
    onChange(newValues.join(""));

    const focusIndex = Math.min(paste.length, length - 1);
    inputsRef.current[focusIndex]?.focus();
  };

  return (
    <div className="code-input-group">
      {values.map((val, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={val}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          autoFocus={i === 0}
          autoComplete="one-time-code"
          aria-invalid={hasError}
          disabled={disabled}
          className={`code-input-digit${hasError ? " code-input-digit--error" : ""}`}
        />
      ))}
    </div>
  );
}
