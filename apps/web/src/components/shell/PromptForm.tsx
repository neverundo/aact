"use client";

import { FormEvent, useState } from "react";

/** Simple single-field form for drawer prompts (reject reason, password, reference). */
export function PromptForm({
  label,
  submitLabel,
  inputType = "text",
  required = true,
  placeholder,
  onSubmit,
  onCancel,
}: {
  label: string;
  submitLabel: string;
  inputType?: "text" | "password";
  required?: boolean;
  placeholder?: string;
  onSubmit: (value: string) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onSubmit(value);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao submeter.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <label className="flex flex-col gap-1 text-sm">
        {label}
        <input
          type={inputType}
          className="rounded-md border border-stone-300 px-3 py-2"
          value={value}
          placeholder={placeholder}
          required={required}
          autoFocus
          onChange={(e) => setValue(e.target.value)}
        />
      </label>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={loading}
          className="min-h-11 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60"
        >
          {loading ? "A processar…" : submitLabel}
        </button>
        <button
          type="button"
          className="min-h-11 rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100"
          onClick={onCancel}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
