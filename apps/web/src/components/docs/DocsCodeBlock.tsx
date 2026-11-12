"use client";

import { useState } from "react";

export function DocsCodeBlock({
  language,
  code,
  caption,
  copyLabel,
  copiedLabel,
}: {
  language: string;
  code: string;
  caption?: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <figure className="overflow-hidden rounded-md border border-stone-200 bg-stone-900 text-stone-50 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-stone-700 px-3 py-2 text-xs">
        <span className="font-mono uppercase tracking-wide text-stone-300">
          {language}
          {caption ? ` · ${caption}` : null}
        </span>
        <button
          type="button"
          onClick={onCopy}
          className="min-h-9 rounded-md px-2 py-1 font-medium text-stone-100 hover:bg-stone-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-100"
        >
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
      <pre className="max-w-full overflow-x-auto p-4 text-sm leading-relaxed">
        <code>{code}</code>
      </pre>
    </figure>
  );
}
